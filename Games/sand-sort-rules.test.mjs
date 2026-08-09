import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPour,
  getTopRun,
  isSolved,
  listLegalMoves,
  planPour,
  suggestMove,
} from './sand-sort-rules.mjs';

test('getTopRun counts adjacent colors at the mouth', () => {
  assert.deepEqual(getTopRun(['red', 'blue', 'blue']), { color: 'blue', count: 2 });
  assert.deepEqual(getTopRun([]), { color: null, count: 0 });
});

test('planPour moves the largest legal top run that fits', () => {
  const tubes = [['red', 'blue', 'blue'], ['blue', 'blue'], []];
  assert.deepEqual(planPour(tubes, 0, 1), { from: 0, to: 1, color: 'blue', count: 2 });
  assert.deepEqual(planPour(tubes, 0, 2), { from: 0, to: 2, color: 'blue', count: 2 });
});

test('planPour rejects same bottle, empty source, mismatched top and full target', () => {
  const tubes = [['red'], [], ['blue'], ['red', 'red', 'red', 'red']];
  assert.equal(planPour(tubes, 0, 0), null);
  assert.equal(planPour(tubes, 1, 2), null);
  assert.equal(planPour(tubes, 0, 2), null);
  assert.equal(planPour(tubes, 0, 3), null);
});

test('applyPour is immutable and isSolved ignores empty bottles', () => {
  const tubes = [['red', 'blue'], ['blue'], []];
  const next = applyPour(tubes, planPour(tubes, 0, 1));
  assert.deepEqual(tubes, [['red', 'blue'], ['blue'], []]);
  assert.deepEqual(next, [['red'], ['blue', 'blue'], []]);
  assert.equal(isSolved([['red', 'red', 'red', 'red'], [], ['blue', 'blue', 'blue', 'blue']]), true);
  assert.equal(isSolved([['red', 'blue'], [], ['blue', 'red']]), false);
});

test('legal moves and hint never return an illegal action', () => {
  const tubes = [['red', 'blue'], ['blue'], []];
  const moves = listLegalMoves(tubes);
  assert.ok(moves.length > 0);
  assert.ok(moves.every((move) => planPour(tubes, move.from, move.to)));
  const hint = suggestMove(tubes);
  assert.ok(hint);
  assert.deepEqual(hint, planPour(tubes, hint.from, hint.to));
});
