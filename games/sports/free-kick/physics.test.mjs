import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD, PHYSICS, makeShot, advanceShot, advanceAftermath, predictShot, makeKeeper, advanceKeeper } from './physics.mjs';

const clearField = { wall: false, frame: false };
function fly(config, duration, step = 1 / 240) {
  const shot = makeShot(config);
  for (let time = 0; time < duration - 1e-8; time += step) advanceShot(shot, Math.min(step, duration - time), null, clearField);
  return shot;
}
function incoming(values = {}) {
  return Object.assign(makeShot(), { x: 0, y: 1, z: -11, vx: 0, vy: 0, vz: -30, spinX: 0, spinY: 0, spinZ: 0 }, values);
}
function finishShot(shot, keeper = null, options = {}) {
  for (let i = 0; i < 1600 && !shot.result; i++) advanceShot(shot, PHYSICS.step, keeper, options);
  return shot;
}

test('power sets total launch speed and off-centre contact imparts opposite bend', () => {
  const fast = makeShot({ power: 100 }), slow = makeShot({ power: 40 });
  assert.ok(fast.speed > slow.speed);
  assert.ok(Math.abs(Math.hypot(fast.vx, fast.vy, fast.vz) - fast.speed) < 1e-10);
  const leftContact = fly({ side: -1 }, .3), rightContact = fly({ side: 1 }, .3);
  assert.ok(leftContact.x > 0 && rightContact.x < 0);
  assert.ok(Math.abs(leftContact.x + rightContact.x) < 1e-8);
});

test('drag slows a fast shot and side wind acts through relative air velocity', () => {
  const calm = fly({ power: 100, side: 0 }, .3);
  assert.ok(Math.hypot(calm.vx, calm.vz) < Math.hypot(makeShot({ power: 100 }).vx, makeShot({ power: 100 }).vz));
  const left = fly({ side: 0, wind: -3 }, .3), right = fly({ side: 0, wind: 3 }, .3);
  assert.ok(right.x > 0 && left.x < 0);
  assert.ok(Math.abs(right.x + left.x) < 1e-8);
});

test('backspin adds lift while topspin makes the same launch dip', () => {
  const back = incoming({ y: 5, z: 5, spinX: 20 }), top = incoming({ y: 5, z: 5, spinX: -20 });
  advanceShot(back, .3, null, clearField); advanceShot(top, .3, null, clearField);
  assert.ok(back.y > top.y);
});

test('a turf bounce loses energy and continues moving towards the goal', () => {
  const shot = incoming({ y: .2, z: 5, vy: -3, vz: -12 });
  advanceShot(shot, .06, null, clearField);
  assert.ok(shot.bounces > 0 && shot.vy > 0);
  assert.equal(shot.result, null);
  assert.ok(Math.abs(shot.vz) < 12);
  const z = shot.z;
  advanceShot(shot, .15, null, clearField);
  assert.ok(shot.z < z && shot.y >= FIELD.ballRadius);
});

test('the visible wall blocks the torso and rebounds the ball', () => {
  const shot = incoming({ x: FIELD.wallCenters[1], y: 1.2, z: 1.5, time: .3 });
  finishShot(shot);
  assert.equal(shot.result, 'wall');
  assert.ok(shot.wallHit && shot.vz > 0);
});

test('a low ball can travel under the jumping wall', () => {
  const shot = incoming({ x: 0, y: FIELD.ballRadius, z: 1.5, time: .4, rolling: true });
  advanceShot(shot, .05);
  assert.equal(shot.wallHit, false);
  assert.ok(shot.z < FIELD.wallZ);
});

test('swept collision catches a fast ball hitting a thin goalpost', () => {
  const shot = incoming({ x: FIELD.goalHalfWidth + FIELD.postRadius, z: -12.4, vz: -70 });
  advanceShot(shot, 1 / 30);
  assert.ok(shot.postHit && shot.vz > 0);
  assert.equal(finishShot(shot).result, 'post');
});

test('a glance off the inside of a post can still be a goal', () => {
  const shot = incoming({ x: -3.56, z: -12.4, vz: -35 });
  finishShot(shot);
  assert.ok(shot.postHit);
  assert.equal(shot.result, 'goal');
});

test('the entire ball must cross the back of the goal line', () => {
  const shot = incoming({ y: FIELD.ballRadius, z: FIELD.goalZ + .02, vz: -2, rolling: true });
  advanceShot(shot, .04);
  assert.equal(shot.result, null);
  assert.ok(shot.z < FIELD.goalZ);
  advanceShot(shot, .2);
  assert.equal(shot.result, 'goal');
});

test('a rolling ball crossing inside the goal counts; wide and high balls do not', () => {
  assert.equal(finishShot(incoming({ y: FIELD.ballRadius, rolling: true })).result, 'goal');
  assert.equal(finishShot(incoming({ x: 4.5 })).result, 'wide');
  assert.equal(finishShot(incoming({ y: 3.5 })).result, 'over');
});

test('keeper collision is limited to the actual body and gloves', () => {
  assert.equal(finishShot(incoming(), 0).result, 'save');
  assert.equal(finishShot(incoming({ x: .9, y: .4 }), 0).result, 'goal');
  assert.equal(finishShot(incoming({ x: .75, y: 1.45 }), 0).result, 'save');
});

test('keeper has a reaction delay and cannot retarget a committed dive', () => {
  const keeper = makeKeeper(), shot = incoming({ x: -2, z: 2, time: .15 });
  advanceKeeper(keeper, shot, .1);
  assert.equal(keeper.x, 0);
  shot.time = .3;
  advanceKeeper(keeper, shot, .01);
  assert.equal(keeper.diveTime, 0);
  const target = keeper.targetX, direction = keeper.direction;
  shot.x = 3; shot.vx = 20;
  advanceKeeper(keeper, shot, .1);
  assert.equal(keeper.targetX, target);
  assert.equal(keeper.direction, direction);
  assert.ok(keeper.lean !== 0);
});

test('goal keeps moving until the net absorbs its momentum', () => {
  const shot = finishShot(incoming());
  const speed = Math.hypot(shot.vx, shot.vy, shot.vz), z = shot.z;
  advanceAftermath(shot, .3);
  assert.equal(shot.result, 'goal');
  assert.ok(shot.z < z && shot.z >= FIELD.goalZ - 1.95 + FIELD.ballRadius - .001);
  assert.ok(Math.hypot(shot.vx, shot.vy, shot.vz) < speed / 2);
});

test('preview and live simulation without a keeper agree', () => {
  const config = { aim: -14, power: 82, side: -1, height: -1, wind: 1 };
  const preview = predictShot(config);
  const actual = finishShot(makeShot(config));
  assert.equal(actual.result, preview.result);
  for (const [i, key] of ['x', 'y', 'z'].entries()) assert.ok(Math.abs(actual[key] - preview.landing[i]) < 1e-8);
  assert.equal(actual.result, 'goal');
});

test('integration and collision results are stable at 30, 60 and 144 fps', () => {
  const config = { aim: -14, power: 82, side: -1, height: -1 };
  const shots = [30, 60, 144].map(fps => {
    const shot = makeShot(config);
    for (let i = 0; i < fps * 6 && !shot.result; i++) advanceShot(shot, 1 / fps);
    return shot;
  });
  assert.ok(shots.every(shot => shot.result === 'goal'));
  for (const shot of shots.slice(1)) for (const key of ['x', 'y', 'z']) assert.ok(Math.abs(shot[key] - shots[0][key]) < .02);
});

test('every allowed shot resolves, including weak shots and rebounds', () => {
  for (const aim of [-18, -12, 0, 12, 18]) for (const power of [40, 70, 100]) for (const side of [-1, 0, 1]) for (const height of [-1, 0, 1]) {
    const prediction = predictShot({ aim, power, side, height, wind: 2 });
    assert.ok(prediction.result, JSON.stringify({ aim, power, side, height }));
    assert.ok(prediction.landing.every(Number.isFinite));
    assert.ok(prediction.landing[1] >= FIELD.ballRadius - .001);
  }
});
