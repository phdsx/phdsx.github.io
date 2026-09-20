import { TYPES, row, col, isCamp, isHQ, roads, rails, createGame, canSwap, legalMoves, play, chooseMove } from './rules.mjs';

const $ = id => document.getElementById(id);
const names = { red: '红方', blue: '蓝方' };
const coords = i => `${String.fromCharCode(65 + col(i))}${row(i) + 1}`;
let state, selected = null, legal = [], phase = 'setup', mode = 'ai', history = [], timer = null;
const buttons = [];
const position = i => [50 + col(i) * 100, 38 + row(i) * 70 + (row(i) >= 6 ? 34 : 0)];
const svgNS = 'http://www.w3.org/2000/svg';
function line(a, b, style) {
  const element = document.createElementNS(svgNS, 'line');
  const [x1, y1] = position(a), [x2, y2] = position(b);
  Object.entries({ x1, y1, x2, y2, class: style }).forEach(([key, value]) => element.setAttribute(key, value));
  $('routes').append(element);
}
roads.forEach(([a, b]) => line(a, b, 'road'));
rails.forEach(([a, b]) => { line(a, b, 'rail'); line(a, b, 'rail-ties'); });
for (let i = 0; i < 60; i++) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.index = i;
  const [x, y] = position(i);
  button.style.left = `${x / 5}%`;
  button.style.top = `${y / 8.8}%`;
  button.addEventListener('click', () => select(i));
  button.addEventListener('keydown', event => {
    const delta = { ArrowUp: -5, ArrowDown: 5, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      const next = i + delta;
      if (next >= 0 && next < 60 && (Math.abs(delta) === 5 || row(i) === row(next))) buttons[next].focus();
    }
    if (event.key === 'Escape') { selected = null; legal = []; render(); }
  });
  buttons.push(button);
  $('stations').append(button);
}

function render() {
  const last = history.at(-1);
  buttons.forEach((button, i) => {
    const piece = state.board[i];
    const terrain = isCamp(i) ? '行营' : isHQ(i) ? '大本营' : '兵站';
    button.className = ['station', isCamp(i) ? 'camp' : '', isHQ(i) ? 'hq' : '', selected === i ? 'selected' : '', legal.includes(i) ? 'legal' : '', last && [last.from, last.to].includes(i) ? 'last' : ''].filter(Boolean).join(' ');
    button.setAttribute('aria-pressed', String(selected === i));
    button.setAttribute('aria-label', `${coords(i)} ${terrain}，${piece ? names[piece.side] + TYPES[piece.type].name : '空位'}${legal.includes(i) ? '，可落子' : ''}`);
    button.innerHTML = piece ? `<span class="piece ${piece.side}"><strong>${TYPES[piece.type].name}</strong><small>${names[piece.side]}${TYPES[piece.type].rank ? ' ' + '★'.repeat(Math.ceil(TYPES[piece.type].rank / 3)) : ''}</small></span>` : `<span class="terrain">${isCamp(i) || isHQ(i) ? terrain : '·'}</span>`;
  });
  for (const side of ['red', 'blue']) $(side + '-count').textContent = `${state.board.filter(p => p?.side === side).length} 枚`;
  $('phase').textContent = phase === 'setup' ? '准备布阵' : state.winner ? '对局结束' : '对弈进行中';
  $('ply').textContent = `第 ${state.ply} 步`;
  $('status').textContent = phase === 'setup' ? '排兵布阵' : state.winner === 'draw' ? '本局和棋' : state.winner ? `${names[state.winner]}获胜` : `${names[state.turn]}${mode === 'ai' && state.turn === 'blue' ? '思考中…' : '行棋'}`;
  $('status').className = phase === 'setup' || state.winner === 'draw' ? '' : state.winner || state.turn;
  $('start').hidden = phase !== 'setup';
  $('shuffle').hidden = phase !== 'setup';
  $('restart').hidden = phase === 'setup';
  $('undo').disabled = !history.length;
  $('mode').disabled = phase !== 'setup';
  $('blue-role').textContent = mode === 'ai' ? '电脑' : '玩家二';
  $('red-role').textContent = mode === 'ai' ? '你' : '玩家一';
  $('history-count').textContent = history.length;
  $('empty-history').hidden = history.length > 0;
  $('history').replaceChildren(...history.slice(-30).reverse().map(entry => {
    const li = document.createElement('li');
    li.textContent = entry.text;
    return li;
  }));
  $('history').start = history.length;
}
function reset() {
  clearTimeout(timer);
  timer = null;
  state = createGame();
  phase = 'setup'; selected = null; legal = []; history = [];
  $('message').textContent = mode === 'ai' ? '可直接开始，也可以依次点击两枚红方棋子交换位置。' : '依次点击同一方的两枚棋子交换位置，双方均可调整布阵。';
  render();
}
function select(at) {
  if (state.winner || (phase === 'playing' && mode === 'ai' && state.turn === 'blue')) return;
  const piece = state.board[at];
  if (selected === at) { selected = null; legal = []; render(); return; }
  if (phase === 'setup') {
    if (selected !== null && legal.includes(at)) {
      [state.board[selected], state.board[at]] = [state.board[at], state.board[selected]];
      selected = null; legal = [];
      $('message').textContent = '已交换棋子。可以继续调整，或开始对弈。';
    } else if (piece && (mode === 'local' || piece.side === 'red')) {
      selected = at;
      legal = state.board.flatMap((_, i) => canSwap(state.board, at, i) ? [i] : []);
      $('message').textContent = `已选${names[piece.side]}${TYPES[piece.type].name}，点击绿色标记的棋子交换。`;
    } else {
      $('message').textContent = '布阵时只能交换同一方的棋子，行营需要留空。';
    }
  } else if (selected !== null && legal.includes(at)) {
    move(selected, at); return;
  } else if (piece?.side === state.turn) {
    selected = at; legal = legalMoves(state.board, at);
    $('message').textContent = legal.length ? `已选${TYPES[piece.type].name}，点击绿色标记的位置行棋。` : isHQ(at) ? '大本营中的棋子不能移动。' : ['flag', 'mine'].includes(piece.type) ? '军旗和地雷不能移动。' : '这枚棋子暂时无路可走，请选择其他棋子。';
  } else {
    $('message').textContent = '请先选择己方棋子，再点击绿色标记的位置。';
    selected = null; legal = [];
  }
  render();
}
function move(from, to) {
  const outcome = play(state, from, to);
  if (!outcome) return;
  const { attacker, defender, result } = outcome;
  let text = `${names[attacker.side]}${TYPES[attacker.type].name} ${coords(from)} → ${coords(to)}`;
  if (defender) text += result === 'both' ? `，与${TYPES[defender.type].name}同归于尽` : result === 'lose' ? `，被${TYPES[defender.type].name}击败` : `，${defender.type === 'mine' ? '排除' : '吃掉'}${TYPES[defender.type].name}`;
  history.push({ before: state, from, to, text });
  state = outcome.state;
  selected = null; legal = [];
  $('message').textContent = state.winner ? state.reason === 'flag' ? '军旗已被夺取，本局结束。可悔棋复盘，或重新开局。' : state.reason === 'blocked' ? '对方已无合法走法，本局结束。' : '连续 100 步没有交战，本局和棋。' : text;
  render();
  scheduleAI();
}
function scheduleAI() {
  clearTimeout(timer);
  if (mode !== 'ai' || state.turn !== 'blue' || state.winner || phase !== 'playing') return;
  timer = setTimeout(() => {
    timer = null;
    const decision = chooseMove(state);
    if (decision) move(decision.from, decision.to);
  }, 450);
}
$('mode').addEventListener('change', () => { mode = $('mode').value; reset(); });
$('shuffle').addEventListener('click', reset);
$('restart').addEventListener('click', reset);
$('start').addEventListener('click', () => {
  phase = 'playing'; selected = null; legal = [];
  $('message').textContent = '红方先行。选择一枚棋子，向对方军旗进发。';
  render();
});
$('undo').addEventListener('click', () => {
  if (!history.length) return;
  clearTimeout(timer); timer = null;
  let entry = history.pop();
  if (mode === 'ai' && entry.before.turn === 'blue' && history.length) entry = history.pop();
  state = entry.before;
  selected = null; legal = [];
  $('message').textContent = '已撤回上一回合，可以重新选择走法。';
  render();
});
reset();
