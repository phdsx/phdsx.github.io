import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBottleSourceRect,
  computeLayout,
  getMotionSettings,
  hitTestBottle,
  transformBottlePoint,
  tween,
} from './sand-sort-renderer.mjs';

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

test('bottle source crop contains the glass while removing transparent side padding', () => {
  const crop = computeBottleSourceRect(1024, 1536);
  assert.ok(crop.x <= 298 && crop.x + crop.width >= 727);
  assert.ok(crop.y <= 96 && crop.y + crop.height >= 1420);
  assert.ok(crop.width < 700);
  assert.ok(Math.abs(crop.width / crop.height - 1 / 2.45) < 0.001);
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

test('hitTestBottle returns the visible bottle index only', () => {
  const layout = computeLayout(390, 844, 6);
  const first = layout.bottles[0];
  assert.equal(hitTestBottle(layout, first.x + first.width / 2, first.y + first.height / 2), 0);
  assert.equal(hitTestBottle(layout, -10, -10), null);
});
