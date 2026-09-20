import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, createGame, findWinningLine, play, undo } from './gomoku-rules.mjs';

test('black starts, players alternate, and invalid moves leave the game intact', () => {
  const game = createGame();
  assert.equal(undo(game), false);
  assert.equal(play(game, 7, 7), true);
  assert.equal(game.turn, 2);
  const snapshot = JSON.stringify(game);
  for (const [r, c] of [[7, 7], [-1, 0], [15, 0], [0, 15], [1.5, 0], [NaN, 0]]) assert.equal(play(game, r, c), false);
  assert.equal(JSON.stringify(game), snapshot);
  assert.equal(play(game, 7, 8), true);
  assert.equal(game.turn, 1);
  assert.equal(game.board[7][8], 2);
});

for (const [label, dr, dc, row, col] of [['horizontal', 0, 1, 0, 0], ['vertical', 1, 0, 0, 14], ['diagonal', 1, 1, 10, 10], ['anti-diagonal', 1, -1, 10, 4]]) {
  test(`${label} five wins at board edges and blocks subsequent moves`, () => {
    const game = createGame();
    for (let i = 0; i < 5; i++) {
      assert.ok(play(game, row + i * dr, col + i * dc));
      if (i < 4) assert.ok(play(game, 7, i * 2));
    }
    assert.equal(game.winner, 1);
    assert.equal(game.winningLine.length, 5);
    assert.equal(play(game, 8, 8), false);
    assert.ok(undo(game));
    assert.equal(game.winner, 0);
    assert.deepEqual(game.winningLine, []);
    assert.equal(game.turn, 1);
    assert.ok(play(game, row + 4 * dr, col + 4 * dc));
    assert.equal(game.winner, 1);
  });
}

test('a white win is detected', () => {
  const game = createGame();
  for (let i = 0; i < 5; i++) { play(game, 0, i * 2); play(game, 1, i); }
  assert.equal(game.winner, 2);
});

test('a middle move joins both directions and six stones also win', () => {
  const game = createGame();
  for (const col of [0, 1, 2, 4, 5]) game.board[3][col] = 1;
  assert.ok(play(game, 3, 3));
  assert.equal(game.winningLine.length, 6);
});

test('gaps and opposing stones break lines', () => {
  const game = createGame();
  for (const col of [0, 1, 3, 4, 5]) game.board[0][col] = 1;
  assert.deepEqual(findWinningLine(game.board, 0, 3), []);
  game.board[0][2] = 2;
  assert.deepEqual(findWinningLine(game.board, 0, 3), []);
});

test('a full board draws, undo reopens it, and a new game is empty', () => {
  const game = createGame();
  // Alternating pairs shifted each row avoid five in all four directions.
  const byStone = { 1: [], 2: [] };
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) byStone[(Math.floor(c / 2) + r) % 2 + 1].push([r, c]);
  while (game.moves.length < SIZE * SIZE) {
    assert.ok(play(game, ...byStone[game.turn].shift()));
    assert.equal(game.winner, 0);
  }
  assert.equal(game.draw, true);
  assert.equal(play(game, 0, 0), false);
  const last = game.moves.at(-1);
  assert.ok(undo(game));
  assert.equal(game.draw, false);
  assert.equal(game.turn, last.stone);
  assert.ok(play(game, last.row, last.col));
  assert.equal(game.draw, true);
  const fresh = createGame();
  assert.ok(fresh.board.flat().every(stone => stone === 0));
  assert.equal(fresh.moves.length, 0);
  assert.equal(fresh.turn, 1);
});
