export const SIZE = 15;

export function createGame() {
  return { board: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)), turn: 1, moves: [], winner: 0, winningLine: [], draw: false };
}

export function findWinningLine(board, row, col) {
  const stone = board[row]?.[col];
  if (!stone) return [];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [[row, col]];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === stone) {
        line.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

export function play(game, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= SIZE || col < 0 || col >= SIZE || game.winner || game.draw || game.board[row][col]) return false;
  const stone = game.turn;
  game.board[row][col] = stone;
  game.moves.push({ row, col, stone });
  game.winningLine = findWinningLine(game.board, row, col);
  game.winner = game.winningLine.length ? stone : 0;
  game.draw = !game.winner && game.moves.length === SIZE * SIZE;
  if (!game.winner && !game.draw) game.turn = 3 - stone;
  return true;
}

export function undo(game) {
  const move = game.moves.pop();
  if (!move) return false;
  game.board[move.row][move.col] = 0;
  game.turn = move.stone;
  game.winner = 0;
  game.winningLine = [];
  game.draw = false;
  return true;
}
