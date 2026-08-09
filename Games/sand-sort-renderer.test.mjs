import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBottleMouthAnchor,
  computeBottleSourceRect,
  computeLayout,
  createRenderer,
  getMotionSettings,
  hitTestBottle,
  transformBottlePoint,
  tween,
} from './sand-sort-renderer.mjs';

function createCanvasHarness() {
  const calls = [];
  const record = (method) => (...args) => calls.push({ method, args });
  const context = {
    setTransform: record('setTransform'),
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    save: record('save'),
    translate: record('translate'),
    rotate: record('rotate'),
    restore: record('restore'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    arc: record('arc'),
    fill: record('fill'),
    strokeRect: record('strokeRect'),
  };
  const canvas = {
    clientWidth: 390,
    clientHeight: 844,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 390, height: 844 }),
  };
  const assets = {
    background: { name: 'background' },
    bottle: { name: 'bottle', naturalWidth: 1024, naturalHeight: 1536 },
  };
  return { assets, calls, canvas };
}

async function withAnimationGlobals(run) {
  const names = ['devicePixelRatio', 'matchMedia', 'performance', 'requestAnimationFrame'];
  const descriptors = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let frameTime = 0;
  Object.defineProperties(globalThis, {
    devicePixelRatio: { configurable: true, value: 1 },
    matchMedia: { configurable: true, value: () => ({ matches: false }) },
    performance: { configurable: true, value: { now: () => 0 } },
    requestAnimationFrame: {
      configurable: true,
      value: (callback) => {
        frameTime += 310;
        queueMicrotask(() => callback(frameTime));
      },
    },
  });
  try {
    await run();
  } finally {
    for (const name of names) {
      const descriptor = descriptors.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test('mobile layout fits ten bottles in two rows inside the scene', () => {
  const layout = computeLayout(390, 844, 10);
  assert.equal(layout.bottles.length, 10);
  assert.equal(layout.columns, 5);
  assert.ok(layout.bottles.every((box) => box.x >= 0 && box.x + box.width <= 390));
  assert.ok(layout.bottles.every((box) => box.width >= 44 && box.height >= 120));
});

test('desktop layout keeps the portrait board centered', () => {
  const layout = computeLayout(1440, 900, 8);
  assert.ok(layout.scene.width <= 560);
  assert.equal(Math.round(layout.scene.x * 2 + layout.scene.width), 1440);
});

test('mobile bottle rows rest on the two background shelves', () => {
  const layout = computeLayout(390, 844, 10);
  const firstRowBottom = layout.bottles[0].y + layout.bottles[0].height;
  const secondRowBottom = layout.bottles[5].y + layout.bottles[5].height;
  assert.ok(Math.abs(firstRowBottom - 367.984) < 0.5);
  assert.ok(Math.abs(secondRowBottom - 666.76) < 0.5);
});

test('fallback layout keeps extra bottle rows separated inside the scene', () => {
  const layout = computeLayout(390, 844, 12);
  const rowStarts = [layout.bottles[0], layout.bottles[5], layout.bottles[10]];
  assert.ok(rowStarts[0].y + rowStarts[0].height <= rowStarts[1].y);
  assert.ok(rowStarts[1].y + rowStarts[1].height <= rowStarts[2].y);
  assert.ok(rowStarts[2].y + rowStarts[2].height <= layout.scene.height);
});

test('bottle source crop contains the glass while removing transparent side padding', () => {
  const crop = computeBottleSourceRect(1024, 1536);
  assert.ok(crop.x <= 298 && crop.x + crop.width >= 727);
  assert.ok(crop.y <= 96 && crop.y + crop.height >= 1420);
  assert.ok(crop.width < 700);
  assert.ok(Math.abs(crop.width / crop.height - 1 / 2.45) < 0.001);
});

test('production bottle mouth anchor maps the cropped asset lip near the rendered top', () => {
  const anchor = computeBottleMouthAnchor(1024, 1536);
  assert.equal(anchor.x, 0.5);
  assert.ok(Math.abs(anchor.y - 0.03514) < 0.001);
});

test('bottle mouth transform follows the same translated center and rotation as the bottle', () => {
  const point = transformBottlePoint(
    { x: 10, y: 20, width: 40, height: 100 },
    { x: 0.5, y: 0.1 },
    { dx: 5, dy: -3, rotation: Math.PI / 2 },
  );
  assert.ok(Math.abs(point.x - 75) < 0.0001);
  assert.ok(Math.abs(point.y - 67) < 0.0001);
});

test('reduced motion makes invalid-move feedback static', () => {
  const normal = getMotionSettings(false);
  const reduced = getMotionSettings(true);
  assert.ok(normal.shakeDuration > 0 && normal.shakeAmplitude > 0);
  assert.equal(reduced.shakeDuration, 0);
  assert.equal(reduced.shakeAmplitude, 0);
});

test('reduced motion removes the animated hint pulse', () => {
  const normal = getMotionSettings(false);
  const reduced = getMotionSettings(true);
  assert.ok(normal.hintDuration > 0 && normal.hintPulses > 0);
  assert.equal(reduced.hintDuration, 0);
  assert.equal(reduced.hintPulses, 0);
});

test('tween rejects instead of hanging when paint throws', async () => {
  let scheduledFrame;
  const animation = tween(
    100,
    () => {
      throw new Error('paint failed');
    },
    {
      now: () => 0,
      requestFrame: (callback) => {
        scheduledFrame = callback;
      },
    },
  );
  scheduledFrame(16);
  await assert.rejects(animation, /paint failed/);
});

test('renderer composites cropped glass over sand and animates from its production mouth', async () => {
  await withAnimationGlobals(async () => {
    const { assets, calls, canvas } = createCanvasHarness();
    const renderer = createRenderer(canvas, assets);
    const layout = renderer.resize(2);
    const frame = { tubes: [['pink'], []] };

    renderer.draw(frame);
    const backgroundIndex = calls.findIndex((call) => call.method === 'drawImage' && call.args[0] === assets.background);
    const sandIndex = calls.findIndex((call) => call.method === 'fillRect');
    const bottleIndex = calls.findIndex((call) => call.method === 'drawImage' && call.args[0] === assets.bottle);
    const bottleDraw = calls[bottleIndex];
    assert.ok(backgroundIndex < sandIndex && sandIndex < bottleIndex);
    assert.equal(bottleDraw.args.length, 9);
    assert.ok(Math.abs(bottleDraw.args[1] - 235.52) < 0.001);
    assert.ok(Math.abs(bottleDraw.args[3] - 552.96) < 0.001);

    calls.length = 0;
    await renderer.animatePour(frame, { from: 0, to: 1, color: 'pink' });
    const source = layout.bottles[0];
    const target = layout.bottles[1];
    const direction = source.x < target.x ? 1 : -1;
    const dx = target.x + target.width / 2 - (source.x + source.width / 2) - direction * target.width * 0.58;
    const dy = target.y - source.y - source.height * 0.45;
    const expectedMouth = transformBottlePoint(
      source,
      computeBottleMouthAnchor(1024, 1536),
      { dx, dy, rotation: direction * 1.18 },
    );
    const arcs = calls.filter((call) => call.method === 'arc');
    assert.ok(arcs.some((call) => Math.abs(call.args[0] - expectedMouth.x) < 0.001 && Math.abs(call.args[1] - expectedMouth.y) < 0.001));

    await renderer.shake(frame, 0);
    await renderer.flashHint(frame, 0, 1);
    await renderer.celebrate(frame);
  });
});

test('hitTestBottle returns the visible bottle index only', () => {
  const layout = computeLayout(390, 844, 6);
  const first = layout.bottles[0];
  assert.equal(hitTestBottle(layout, first.x + first.width / 2, first.y + first.height / 2), 0);
  assert.equal(hitTestBottle(layout, -10, -10), null);
});
