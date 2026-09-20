import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, createBoard, canDeploy, canSwap, isCamp, legalMoves, combat, createGame, play, chooseMove, allMoves } from './rules.mjs';
const piece = (type, side = 'red') => ({ type, side });
const boardWith = entries => Object.assign(Array(60).fill(null), entries);

test('random formations contain every piece, obey deployment and keep camps empty', () => {
  for (let n = 0; n < 150; n++) {
    const board = createBoard();
    assert.equal(board.length, 60);
    assert.equal(board.filter(Boolean).length, 50);
    board.forEach((p, i) => { if (p) assert.ok(canDeploy(p, i)); if (isCamp(i)) assert.equal(p, null); });
    for (const side of ['red', 'blue']) for (const [type, info] of Object.entries(TYPES)) {
      assert.equal(board.filter(p => p?.side === side && p.type === type).length, info.count);
    }
  }
});
test('deployment rejects mines in front, bombs in front, flags outside HQ and opposing swaps', () => {
  assert.equal(canDeploy(piece('mine'), 45), false);
  assert.equal(canDeploy(piece('bomb'), 30), false);
  assert.equal(canDeploy(piece('flag'), 55), false);
  assert.equal(canDeploy(piece('flag'), 56), true);
  assert.equal(canSwap(boardWith({ 30: piece('engineer'), 31: piece('bomb') }), 30, 31), false);
  assert.equal(canSwap(boardWith({ 30: piece('engineer'), 25: piece('commander', 'blue') }), 30, 25), false);
  assert.equal(canSwap(boardWith({ 30: piece('engineer'), 31: piece('commander') }), 30, 31), true);
});
test('flag, mine and HQ occupants cannot move', () => {
  for (const [type, at] of [['flag', 56], ['mine', 50], ['commander', 58]]) assert.deepEqual(legalMoves(boardWith({ [at]: piece(type) }), at), []);
});
test('roads permit diagonal camp access, but not arbitrary diagonals', () => {
  const legal = legalMoves(boardWith({ 40: piece('company') }), 40);
  assert.ok(legal.includes(36));
  assert.ok(legal.includes(46));
  assert.ok(!legal.includes(42));
});
test('occupied enemy camps are protected and friendly pieces block landing', () => {
  const board = boardWith({ 40: piece('commander'), 36: piece('engineer', 'blue'), 41: piece('engineer') });
  assert.ok(!legalMoves(board, 40).includes(36));
  assert.ok(!legalMoves(board, 40).includes(41));
});
test('ordinary railway movement is straight and stops at the first piece', () => {
  let board = boardWith({ 30: piece('commander'), 32: piece('engineer', 'blue') });
  assert.ok(legalMoves(board, 30).includes(32));
  assert.ok(!legalMoves(board, 30).includes(33));
  board[32] = piece('engineer');
  assert.ok(!legalMoves(board, 30).includes(32));
  board[32] = null;
  assert.ok(legalMoves(board, 30).includes(34));
  assert.ok(!legalMoves(board, 30).includes(54));
});
test('engineers turn on railways but cannot jump blockers', () => {
  const board = boardWith({ 30: piece('engineer') });
  assert.ok(legalMoves(board, 30).includes(54));
  board[25] = piece('company'); board[31] = piece('company'); board[35] = piece('company');
  assert.ok(!legalMoves(board, 30).includes(54));
});
test('frontier has only three connected passes and no camp diagonals', () => {
  for (const [from, to] of [[26, 31], [28, 33]]) assert.ok(!legalMoves(boardWith({ [from]: piece('company') }), from).includes(to));
  for (const [from, to] of [[25, 30], [27, 32], [29, 34]]) assert.ok(legalMoves(boardWith({ [from]: piece('company') }), from).includes(to));
});
test('combat ranks, equal ranks, mines and bombs follow the published variant', () => {
  assert.equal(combat(piece('commander'), piece('general')), 'win');
  assert.equal(combat(piece('company'), piece('general')), 'lose');
  assert.equal(combat(piece('general'), piece('general')), 'both');
  assert.equal(combat(piece('engineer'), piece('mine')), 'win');
  assert.equal(combat(piece('commander'), piece('mine')), 'lose');
  for (const type of Object.keys(TYPES)) assert.equal(combat(piece('bomb'), piece(type)), 'both');
});
test('invalid turns and illegal moves leave input state intact', () => {
  const game = createGame();
  const snapshot = JSON.stringify(game);
  assert.equal(play(game, 0, 5), null);
  assert.equal(play(game, 30, 0), null);
  assert.equal(JSON.stringify(game), snapshot);
});
test('combat removes the correct pieces and does not mutate history snapshots', () => {
  const board = boardWith({ 30: piece('company'), 25: piece('company', 'blue'), 9: piece('engineer', 'blue') });
  const game = createGame(board);
  const result = play(game, 30, 25);
  assert.equal(result.state.board[30], null);
  assert.equal(result.state.board[25], null);
  assert.equal(game.board[30].type, 'company');
  assert.equal(result.state.turn, 'blue');
});
test('capture or bombing of a flag ends the game immediately', () => {
  for (const type of ['company', 'bomb']) {
    const game = createGame(boardWith({ 6: piece(type), 1: piece('flag', 'blue'), 9: piece('engineer', 'blue') }));
    const result = play(game, 6, 1);
    assert.equal(result.state.winner, 'red');
    assert.equal(result.state.reason, 'flag');
    assert.equal(play(result.state, 9, 8), null);
  }
});
test('opponent with no legal moves loses', () => {
  const result = play(createGame(boardWith({ 30: piece('engineer'), 1: piece('flag', 'blue') })), 30, 31);
  assert.equal(result.state.winner, 'red');
  assert.equal(result.state.reason, 'blocked');
});
test('100 non-combat moves draw, while combat resets the counter', () => {
  const game = createGame(boardWith({ 30: piece('company'), 9: piece('engineer', 'blue'), 25: piece('engineer', 'blue') }));
  game.quiet = 99;
  assert.equal(play(game, 30, 31).state.winner, 'draw');
  assert.equal(play(game, 30, 25).state.quiet, 0);
});
test('computer chooses a legal move and takes a winning flag capture', () => {
  const game = createGame(boardWith({ 6: piece('engineer', 'blue'), 1: piece('flag'), 50: piece('engineer') }));
  game.turn = 'blue';
  assert.deepEqual(chooseMove(game), { from: 6, to: 1 });
  const opening = createGame();
  assert.ok(allMoves(opening.board, opening.turn).some(m => JSON.stringify(m) === JSON.stringify(chooseMove(opening, () => 0.5))));
});
