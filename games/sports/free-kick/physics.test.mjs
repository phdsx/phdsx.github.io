import assert from 'node:assert/strict';
import test from 'node:test';
import { makeShot, advanceShot, predictShot } from './physics.mjs';

test('power increases forward speed and side contact bends the flight', () => {
  assert.ok(-makeShot({ power: 90 }).vz > -makeShot({ power: 45 }).vz);
  const left = predictShot({ aim: -5, power: 82, side: -1, height: -1 });
  const right = predictShot({ aim: -5, power: 82, side: 1, height: -1 });
  assert.ok(right.landing[0] > left.landing[0]);
});

test('wind shifts the ball in its own direction', () => {
  const against = predictShot({ aim: -5, power: 82, side: 0, height: -1, wind: -3 });
  const withWind = predictShot({ aim: -5, power: 82, side: 0, height: -1, wind: 3 });
  assert.ok(withWind.landing[0] > against.landing[0]);
});

test('wall, goalkeeper and goal all affect the result', () => {
  assert.equal(predictShot({ aim: 0, power: 70, height: 0 }).result, 'wall');
  const config = { aim: -5, power: 82, side: 0, height: -1, wind: 0 };
  assert.equal(predictShot(config).result, 'goal');
  const shot = makeShot(config);
  for (let i = 0; i < 500 && !shot.result; i++) advanceShot(shot, 1 / 120, -2.5);
  assert.equal(shot.result, 'save');
});
