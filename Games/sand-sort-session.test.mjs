import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addExtraTube,
  commitPendingMove,
  createSession,
  getHint,
  restart,
  reshuffle,
  selectTube,
  undo,
} from './sand-sort-session.mjs';
import { planPour } from './sand-sort-rules.mjs';

test('two selections stage and commit one legal move with history', () => {
  let session = createSession(0, 0);
  const solution = session.level.solution[0];
  session = selectTube(session, solution.from);
  session = selectTube(session, solution.to);
  assert.ok(session.pendingMove);
  session = commitPendingMove(session);
  assert.equal(session.history.length, 1);
  assert.equal(session.selected, null);
});

test('undo restores the previous immutable tubes', () => {
  let session = createSession(0, 0);
  const before = session.tubes;
  const solution = session.level.solution[0];
  session = commitPendingMove(selectTube(selectTube(session, solution.from), solution.to));
  session = undo(session);
  assert.deepEqual(session.tubes, before);
  assert.notEqual(session.tubes, before);
  assert.notEqual(session.tubes[0], before[0]);
});

test('extra bottle is free but only one can be active at a time', () => {
  let session = createSession(0, 0);
  const baseCount = session.tubes.length;
  session = addExtraTube(session);
  const once = session.tubes;
  session = addExtraTube(session);
  assert.equal(session.tubes.length, baseCount + 1);
  assert.equal(session.extraTube, true);
  assert.equal(session.tubes, once);
});

test('restart removes extra bottle and reshuffle changes variation', () => {
  let session = addExtraTube(createSession(4, 0));
  session = restart(session);
  assert.equal(session.extraTube, false);
  const next = reshuffle(session);
  assert.equal(next.variation, 1);
  assert.notDeepEqual(next.tubes, session.tubes);
});

test('empty, invalid, and repeated selections leave the tube state unchanged', () => {
  const session = createSession(0, 0);
  const emptyIndex = session.tubes.findIndex((tube) => tube.length === 0);
  const sourceIndex = session.tubes.findIndex((tube) => tube.length > 0);
  const selected = selectTube(session, sourceIndex);
  const cancelled = selectTube(selected, sourceIndex);
  const empty = selectTube(session, emptyIndex);
  const invalid = selectTube(selected, session.tubes.findIndex((tube, index) => index !== sourceIndex && tube.length > 0 && tube.at(-1) !== session.tubes[sourceIndex].at(-1)));

  assert.equal(cancelled.selected, null);
  assert.equal(empty.selected, null);
  assert.equal(invalid.selected, null);
  assert.deepEqual(cancelled.tubes, session.tubes);
  assert.deepEqual(empty.tubes, session.tubes);
  assert.deepEqual(invalid.tubes, session.tubes);
});

test('pending moves lock selection until they are committed', () => {
  let session = createSession(0, 0);
  const move = session.level.solution[0];
  session = selectTube(selectTube(session, move.from), move.to);
  const locked = selectTube(session, move.from);

  assert.equal(locked, session);
  assert.equal(locked.pendingMove.from, move.from);
  assert.equal(locked.pendingMove.to, move.to);
  assert.deepEqual(commitPendingMove(session).tubes, commitPendingMove(locked).tubes);
});

test('undo without history and committing without a move preserve state', () => {
  const session = createSession(0, 0);
  assert.equal(commitPendingMove(session), session);
  const undone = undo(session);
  assert.notEqual(undone, session);
  assert.deepEqual(undone.tubes, session.tubes);
  assert.equal(undone.history.length, 0);
});

test('hint is a current legal move and a solved session cannot be selected', () => {
  let session = createSession(0, 0);
  const hint = getHint(session);
  assert.deepEqual(hint, planPour(session.tubes, hint.from, hint.to, session.level.capacity));

  for (const move of session.level.solution) {
    session = commitPendingMove(selectTube(selectTube(session, move.from), move.to));
  }
  assert.equal(session.solved, true);
  assert.equal(selectTube(session, 0), session);
});
