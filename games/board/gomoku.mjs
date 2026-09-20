import { SIZE, createGame, play, undo } from './gomoku-rules.mjs';

const board = document.getElementById('board');
const status = document.getElementById('status');
const cells = [];
let game = createGame();
let focusIndex = 7 * SIZE + 7;
const t = (key, fallback, variables) => window.PHDSXI18n?.t(key, fallback, variables) || fallback;
const name = stone => stone === 1 ? t('gomoku.black', '黑方') : t('gomoku.white', '白方');
const coordinate = (row, col) => `${String.fromCharCode(65 + col)}${SIZE - row}`;

for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'gomoku-cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    if (([3, 11].includes(row) && [3, 11].includes(col)) || (row === 7 && col === 7)) cell.classList.add('star');
    const piece = document.createElement('span');
    piece.className = 'gomoku-piece';
    piece.setAttribute('aria-hidden', 'true');
    cell.append(piece);
    cell.addEventListener('click', () => {
      setFocus(row * SIZE + col);
      if (play(game, row, col)) render();
    });
    cells.push(cell);
    board.append(cell);
  }
}

function setFocus(index, moveFocus = false) {
  cells[focusIndex].tabIndex = -1;
  focusIndex = index;
  cells[index].tabIndex = 0;
  if (moveFocus) cells[index].focus();
}

board.addEventListener('keydown', event => {
  const directions = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const row = Math.max(0, Math.min(SIZE - 1, Math.floor(focusIndex / SIZE) + direction[0]));
  const col = Math.max(0, Math.min(SIZE - 1, focusIndex % SIZE + direction[1]));
  setFocus(row * SIZE + col, true);
});

function render() {
  const last = game.moves.at(-1);
  const winning = new Set(game.winningLine.map(([r, c]) => r * SIZE + c));
  cells.forEach((cell, index) => {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const stone = game.board[row][col];
    cell.classList.toggle('black', stone === 1);
    cell.classList.toggle('white', stone === 2);
    cell.classList.toggle('last', last?.row === row && last?.col === col);
    cell.classList.toggle('winning', winning.has(index));
    cell.tabIndex = index === focusIndex ? 0 : -1;
    cell.setAttribute('aria-disabled', String(Boolean(stone || game.winner || game.draw)));
    cell.setAttribute('aria-label', `${coordinate(row, col)} · ${stone ? name(stone) : t('gomoku.empty', '空位')}`);
  });
  board.setAttribute('aria-label', t('gomoku.board', '五子棋棋盘'));
  status.textContent = game.winner ? t('gomoku.won', '{player}获胜！', { player: name(game.winner) }) : game.draw ? t('gomoku.draw', '棋盘已满，和棋') : t('gomoku.turn', '{player}落子', { player: name(game.turn) });
  document.getElementById('turn-stone').classList.toggle('white', (game.winner || game.turn) === 2);
  document.getElementById('move-count').textContent = game.moves.length;
  document.getElementById('last-move').textContent = last ? coordinate(last.row, last.col) : '—';
  document.getElementById('undo').disabled = game.moves.length === 0;
}

document.getElementById('undo').addEventListener('click', () => {
  const last = game.moves.at(-1);
  if (undo(game)) { setFocus(last.row * SIZE + last.col); render(); }
});
document.getElementById('restart').addEventListener('click', () => {
  game = createGame();
  setFocus(7 * SIZE + 7);
  render();
});
window.PHDSXI18n?.onChange(render);
render();
