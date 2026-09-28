import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, hitTestBottle, getMotionSettings, tween } from './sand-sort-renderer.mjs';
import { createSandSurface, sampleSurfaceMean, getVisibleLayers, stepGrain, SAND_FLOOR, SAND_UNIT_HEIGHT } from './sand-sort-physics.mjs';

test('six bottles retain the reference proportions and rest on both shelf edges', () => {
  const layout = computeLayout(390, 693, 6);
  assert.equal(layout.columns, 3);
  assert.ok(layout.bottleWidth > 70);
  assert.ok(Math.abs(layout.bottles[0].y + layout.bottleHeight - 693 * 0.489) < 0.01);
  assert.ok(Math.abs(layout.bottles[3].y + layout.bottleHeight - 693 * 0.827) < 0.01);
});
test('ten bottles plus the extra bottle fit without overlapping on a short phone', () => {
  for (const count of [4, 6, 7, 10, 11, 12]) {
    const layout = computeLayout(360, 640, count);
    assert.ok(layout.bottles.every(box => box.x >= 0 && box.x + box.width <= 360 && box.y >= 70 && box.y + box.height < 560));
    for (let i = 1; i < count; i++) {
      const previous = layout.bottles[i - 1], current = layout.bottles[i];
      assert.ok(current.y > previous.y || current.x >= previous.x + previous.width);
    }
  }
});
test('hit testing follows the actual rendered bottle boxes', () => {
  const layout = computeLayout(390,693,6);
  const box = layout.bottles[4];
  assert.equal(hitTestBottle(layout,box.x + box.width / 2,box.y + 20),4);
  assert.equal(hitTestBottle(layout,0,0),null);
  const dense = computeLayout(360,640,11), second = dense.bottles[1];
  assert.equal(hitTestBottle(dense,second.x + 0.1,second.y + second.height / 2),1);
});
test('reduced motion removes bottle shake and hint pulses', () => {
  const settings = getMotionSettings(true);
  assert.equal(settings.shakeDuration,0);
  assert.equal(settings.hintDuration,0);
  assert.ok(settings.pourDuration <= 200);
});
test('a failed animation frame rejects instead of leaving input locked forever', async () => {
  let callback;
  const animation = tween(100,() => { throw new Error('render failed'); },{ now:() => 0,requestFrame:fn => { callback = fn; } });
  callback(16);
  await assert.rejects(animation,/render failed/);
});
test('source and receiver conserve volume throughout fractional pouring', () => {
  for (const amount of [0,0.1,0.9,1.4,2]) {
    const source = getVisibleLayers(['pink','blue','blue'],amount);
    const receiver = getVisibleLayers(['pink'],0,'blue',amount);
    const volume = layers => layers.reduce((sum,layer) => sum + layer.units,0);
    assert.ok(Math.abs(volume(source) + volume(receiver) - 4) < 0.000001);
  }
});
test('tilt and a settling mound retain the same sand volume', () => {
  for (const units of [0.05,0.5,1.8,4]) for (const tilt of [-1.33,-0.3,0,0.3,1.33]) {
    const expected = SAND_FLOOR + units * SAND_UNIT_HEIGHT;
    const surface = createSandSurface(expected,{tilt,mound:0.27});
    assert.ok(Math.abs(sampleSurfaceMean(surface) - expected) < 0.00001);
  }
});
test('tilted color boundaries stay ordered instead of crossing each other', () => {
  const lower = createSandSurface(SAND_FLOOR + SAND_UNIT_HEIGHT,{tilt:1.33});
  const upper = createSandSurface(SAND_FLOOR + SAND_UNIT_HEIGHT * 2,{tilt:1.33});
  for (let x = -0.53; x <= 0.53; x += 0.01) assert.ok(upper.height(x,0) >= lower.height(x,0));
});
test('a free grain accelerates under gravity and loses energy on contact', () => {
  const grain = {x:0,y:1,z:0,vx:0.1,vy:0,vz:0,age:0};
  stepGrain(grain,0.1);
  assert.ok(grain.vy < -0.9 && grain.y < 1 && grain.x > 0);
  const collider = {x:0,z:0,radius:0.5,height:() => 0};
  for (let i = 0; i < 20; i++) stepGrain(grain,0.1,collider);
  assert.ok(grain.contacts > 0 && grain.y >= 0 && Math.abs(grain.vy) < 0.2);
});
test('a thin mound on an inclined color boundary remains above it and preserves volume', () => {
  const lower = createSandSurface(SAND_FLOOR + SAND_UNIT_HEIGHT,{tilt:0.28});
  const expected = SAND_FLOOR + SAND_UNIT_HEIGHT * 1.1;
  const upper = createSandSurface(expected,{tilt:-0.28,mound:0.27,lowerSurface:lower});
  assert.ok(Math.abs(sampleSurfaceMean(upper) - expected) < 0.00001);
  for (let x = -0.53; x <= 0.53; x += 0.01) assert.ok(upper.height(x,0) >= lower.height(x,0));
});
