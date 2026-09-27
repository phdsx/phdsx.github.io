import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from './model.ts';
import { TILE, TUNING } from './config.ts';

const playing = () => { const match = new Match(); match.start(); return match; };
const bomb = (id: number, x: number, y: number, owner = 0, remaining = 10, power = 2) => ({ id, x, y, owner, remaining, power, passOwner: false });

test('reference board stays 17 by 13 with fixed stones and transcribed bricks', () => {
  const match = playing();
  assert.equal(match.map.length, 13); assert.ok(match.map.every(row => row.length === 17));
  assert.equal(match.tile(2, 2), 'stone'); assert.equal(match.tile(7, 2), 'brick');
  assert.equal(match.tile(7, 1), 'brick'); assert.equal(match.tile(11, 9), 'floor');
});

test('stone blocks flames and a brick is destroyed without passing fire beyond it', () => {
  const match = playing();
  const horizontal = match.blastCells(5, 3, 5);
  assert.ok(horizontal.some(f => f.x === 7 && f.y === 3));
  assert.ok(!horizontal.some(f => f.x === 8 && f.y === 3));
  const vertical = match.blastCells(5, 2, 4);
  assert.ok(!vertical.some(f => f.x === 6 && f.y === 2));
  match.bombs.push(bomb(20, 5, 3, 0, 1, 5)); match.step(16);
  assert.equal(match.tile(7, 3), 'floor');
  assert.ok(!match.flames.some(f => f.x === 8 && f.y === 3));
});

test('a flame immediately chains another bomb, returning both capacities', () => {
  const match = playing();
  match.bombs.push(bomb(20, 9, 3, 0, 1), bomb(21, 11, 3, 1, 1900));
  match.detonate([match.bombs[0]]);
  assert.equal(match.bombs.length, 0);
  assert.ok(match.flames.some(f => f.x === 13 && f.y === 3));
  assert.equal(match.activeBombs(0), 0); assert.equal(match.activeBombs(1), 0);
});

test('simultaneous blast arms overlap without duplicating or retaining bombs', () => {
  const match = playing();
  match.bombs.push(bomb(31, 5, 9, 0, 1), bomb(32, 7, 9, 1, 1));
  match.detonate([...match.bombs]);
  assert.equal(match.bombs.length, 0);
  assert.ok(match.flames.filter(f => f.x === 6 && f.y === 9).length >= 2);
  assert.equal(match.events.filter(e => e === 'blast').length, 1);
});

test('placer can exit their bomb but cannot walk back through it', () => {
  const match = playing(); const actor = match.actors[0];
  assert.ok(match.placeBomb(0));
  for (let i = 0; i < 13; i++) match.move(actor, 'right', 30);
  assert.ok(actor.x > 4 * TILE); assert.equal(match.bombs[0].passOwner, false);
  for (let i = 0; i < 15; i++) match.move(actor, 'left', 30);
  assert.ok(actor.x >= 4 * TILE - TUNING.footRadiusPx);
});

test('an opponent sharing the placement cell can also exit, then loses passage', () => {
  const match = playing(); const opponent = match.actors[1];
  opponent.x = match.actors[0].x; opponent.y = match.actors[0].y;
  assert.ok(match.placeBomb(0));
  for (let i = 0; i < 13; i++) match.move(opponent, 'right', 30);
  assert.ok(opponent.x > 4 * TILE);
  assert.equal(match.bombs[0].passers?.has(opponent.id), false);
  for (let i = 0; i < 15; i++) match.move(opponent, 'left', 30);
  assert.ok(opponent.x >= 4 * TILE - TUNING.footRadiusPx);
});

test('foot collision stops at a corner without using the head sprite height', () => {
  const match = playing(); const actor = match.actors[0];
  actor.x = 3.5 * TILE; actor.y = 2.5 * TILE;
  for (let i = 0; i < 30; i++) match.move(actor, 'left', 30);
  assert.ok(actor.x >= 3 * TILE + TUNING.footRadiusPx - 1);
  assert.ok(actor.x < 3.5 * TILE);
});

test('all three basic pickups modify their actual attributes', () => {
  const match = playing(); const actor = match.actors[0];
  const initialSpeed = actor.speed;
  for (const kind of ['bomb', 'flame', 'speed'] as const) {
    match.items.push({ x: 3, y: 1, kind }); match.step(16);
  }
  assert.equal(actor.bombsMax, 2); assert.equal(actor.power, 3);
  assert.equal(actor.speed, initialSpeed * 1.25);
});

test('AI verifies a timed route out before placing; unsafe traps are rejected', () => {
  const match = playing(); const actor = match.actors[1];
  const cell = match.actorCell(actor);
  const proposed = bomb(99, cell.x, cell.y, actor.id, 2000);
  assert.equal(match.escape(actor, proposed).safe, true);
  // Seal every exit in a small isolated floor cell.
  actor.x = 1.5 * TILE; actor.y = 1.5 * TILE;
  match.map[1][2] = 'stone'; match.map[2][1] = 'stone';
  const trapped = bomb(100, 1, 1, actor.id, 2000);
  assert.equal(match.escape(actor, trapped).safe, false);
});

test('restart produces a clean round with original map and alive actors', () => {
  const first = playing();
  first.map[7][7] = 'floor'; first.actors[0].alive = false;
  first.bombs.push(bomb(8, 3, 1));
  const next = playing();
  assert.equal(next.tile(7, 7), 'brick'); assert.ok(next.actors.every(a => a.alive));
  assert.equal(next.bombs.length, 0); assert.equal(next.phase, 'playing');
});

test('human elimination is a loss; simultaneous elimination and timeout are draws', () => {
  const lost = playing(); lost.actors[0].alive = false; lost.step(16);
  assert.equal(lost.phase, 'finished'); assert.equal(lost.winner, -1);
  const tied = playing(); tied.actors.forEach(a => { a.alive = false; }); tied.step(16);
  assert.equal(tied.winner, null);
  const timed = playing(); timed.remaining = 1; timed.step(16);
  assert.equal(timed.phase, 'finished'); assert.equal(timed.winner, null);
});
