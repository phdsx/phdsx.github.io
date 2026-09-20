export const ROWS = 12;
export const COLS = 5;
export const TYPES = {
  commander: { name: '司令', rank: 9, count: 1 },
  general: { name: '军长', rank: 8, count: 1 },
  division: { name: '师长', rank: 7, count: 2 },
  brigade: { name: '旅长', rank: 6, count: 2 },
  regiment: { name: '团长', rank: 5, count: 2 },
  battalion: { name: '营长', rank: 4, count: 2 },
  company: { name: '连长', rank: 3, count: 3 },
  platoon: { name: '排长', rank: 2, count: 3 },
  engineer: { name: '工兵', rank: 1, count: 3 },
  mine: { name: '地雷', rank: 0, count: 3 },
  bomb: { name: '炸弹', rank: 0, count: 2 },
  flag: { name: '军旗', rank: 0, count: 1 },
};
export const other = side => side === 'red' ? 'blue' : 'red';
export const row = i => Math.floor(i / COLS);
export const col = i => i % COLS;
export const isCamp = i => [11, 13, 17, 21, 23, 36, 38, 42, 46, 48].includes(i);
export const isHQ = i => [1, 3, 56, 58].includes(i);
export const homeSide = i => row(i) < 6 ? 'blue' : 'red';

// Each edge is shared by the rules and the visible board, including the three passes.
export const roads = [];
export const rails = [];
for (let a = 0; a < 60; a++) {
  for (let b = a + 1; b < 60; b++) {
    const dr = Math.abs(row(a) - row(b)), dc = Math.abs(col(a) - col(b));
    const crossing = row(a) === 5 && row(b) === 6;
    const adjacent = dr + dc === 1 && (!crossing || [0, 2, 4].includes(col(a)));
    const diagonal = dr === 1 && dc === 1 && homeSide(a) === homeSide(b) && (isCamp(a) || isCamp(b));
    if (adjacent || diagonal) roads.push([a, b]);
    const horizontal = dr === 0 && dc === 1 && [1, 5, 6, 10].includes(row(a));
    const vertical = dc === 0 && dr === 1 && row(a) >= 1 && row(b) <= 10 && ([0, 4].includes(col(a)) || (crossing && col(a) === 2));
    if (horizontal || vertical) rails.push([a, b]);
  }
}
const neighbors = edges => Array.from({ length: 60 }, (_, i) => edges.flatMap(([a, b]) => a === i ? [b] : b === i ? [a] : []));
const roadGraph = neighbors(roads), railGraph = neighbors(rails);

export function canDeploy(piece, at) {
  if (!piece || at < 0 || at >= 60 || homeSide(at) !== piece.side || isCamp(at)) return false;
  if (piece.type === 'flag') return isHQ(at);
  if (piece.type === 'mine') return piece.side === 'red' ? row(at) >= 10 : row(at) <= 1;
  if (piece.type === 'bomb') return row(at) !== (piece.side === 'red' ? 6 : 5);
  return true;
}
export function canSwap(board, a, b) {
  return a !== b && !!board[a] && !!board[b] && canDeploy(board[a], b) && canDeploy(board[b], a);
}
function shuffle(list, rng) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createBoard(rng = Math.random) {
  const board = Array(60).fill(null);
  for (const side of ['blue', 'red']) {
    const spots = shuffle(Array.from({ length: 60 }, (_, i) => i).filter(i => homeSide(i) === side && !isCamp(i)), rng);
    // Place restricted pieces first so every randomized formation is valid.
    const order = ['flag', 'mine', 'bomb', ...shuffle(Object.keys(TYPES).filter(t => !['flag', 'mine', 'bomb'].includes(t)), rng)];
    for (const type of order) {
      for (let n = 0; n < TYPES[type].count; n++) {
        const piece = { side, type };
        const at = spots.find(i => !board[i] && canDeploy(piece, i));
        board[at] = piece;
      }
    }
  }
  return board;
}
export function legalMoves(board, from) {
  const piece = board[from];
  if (!piece || ['mine', 'flag'].includes(piece.type) || isHQ(from)) return [];
  const destinations = new Set();
  const canLand = i => board[i]?.side !== piece.side && !(board[i] && isCamp(i));
  roadGraph[from].forEach(i => { if (canLand(i)) destinations.add(i); });
  if (piece.type === 'engineer') {
    const visited = new Set([from]), queue = [from];
    for (let head = 0; head < queue.length; head++) {
      for (const next of railGraph[queue[head]]) {
        if (visited.has(next)) continue;
        visited.add(next);
        if (canLand(next)) destinations.add(next);
        if (!board[next]) queue.push(next);
      }
    }
  } else {
    for (const first of railGraph[from]) {
      const step = first - from;
      let current = from, next = first;
      while (railGraph[current].includes(next)) {
        if (canLand(next)) destinations.add(next);
        if (board[next]) break;
        current = next;
        next += step;
      }
    }
  }
  return [...destinations];
}
export function combat(attacker, defender) {
  if (!defender) return 'move';
  if (attacker.type === 'bomb' || defender.type === 'bomb') return 'both';
  if (defender.type === 'flag') return 'win';
  if (defender.type === 'mine') return attacker.type === 'engineer' ? 'win' : 'lose';
  const diff = TYPES[attacker.type].rank - TYPES[defender.type].rank;
  return diff > 0 ? 'win' : diff < 0 ? 'lose' : 'both';
}
export function allMoves(board, side) {
  return board.flatMap((p, from) => p?.side === side ? legalMoves(board, from).map(to => ({ from, to })) : []);
}
export function createGame(board = createBoard()) {
  return { board, turn: 'red', winner: null, reason: '', quiet: 0, ply: 0 };
}
export function play(state, from, to) {
  if (state.winner || state.board[from]?.side !== state.turn || !legalMoves(state.board, from).includes(to)) return null;
  const board = [...state.board], attacker = board[from], defender = board[to];
  const result = combat(attacker, defender);
  board[from] = null;
  if (result === 'both') board[to] = null;
  else if (result !== 'lose') board[to] = attacker;
  const next = { board, turn: other(state.turn), winner: null, reason: '', quiet: defender ? 0 : state.quiet + 1, ply: state.ply + 1 };
  if (defender?.type === 'flag') { next.winner = state.turn; next.reason = 'flag'; }
  else if (!allMoves(board, next.turn).length) { next.winner = state.turn; next.reason = 'blocked'; }
  else if (next.quiet >= 100) { next.winner = 'draw'; next.reason = 'quiet'; }
  return { state: next, attacker, defender, result, from, to };
}
const value = piece => !piece ? 0 : piece.type === 'flag' ? 10000 : piece.type === 'bomb' ? 65 : piece.type === 'mine' ? 35 : piece.type === 'engineer' ? 45 : TYPES[piece.type].rank * 12;
// A lightweight, open-information opponent: compare captures and the best immediate reply.
export function chooseMove(state, rng = Math.random) {
  let best = null, bestScore = -Infinity;
  for (const move of allMoves(state.board, state.turn)) {
    const outcome = play(state, move.from, move.to);
    let score = rng() * 4;
    if (outcome.state.winner === state.turn) return move;
    const { attacker, defender, result, state: next } = outcome;
    if (defender && result !== 'lose') score += value(defender);
    if (result === 'lose' || result === 'both') score -= value(attacker);
    let risk = 0;
    for (const reply of allMoves(next.board, next.turn)) {
      const target = next.board[reply.to];
      if (!target) continue;
      const enemy = next.board[reply.from], replyResult = combat(enemy, target);
      risk = Math.max(risk, target.type === 'flag' ? 10000 : replyResult === 'win' ? value(target) : replyResult === 'both' ? value(target) - value(enemy) : 0);
    }
    score -= risk * 0.9;
    score += (row(move.to) - row(move.from)) * (state.turn === 'blue' ? 0.7 : -0.7);
    if (isHQ(move.to) && defender?.type !== 'flag') score -= value(attacker) * 0.8;
    if (score > bestScore) { bestScore = score; best = move; }
  }
  return best;
}
