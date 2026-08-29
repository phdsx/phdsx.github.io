export const DEFAULT_CAPACITY = 4;

export function getTopRun(tube) {
  if (!tube.length) return { color: null, count: 0 };
  const color = tube.at(-1);
  let count = 1;
  for (let index = tube.length - 2; index >= 0 && tube[index] === color; index -= 1) count += 1;
  return { color, count };
}

export function planPour(tubes, from, to, capacity = DEFAULT_CAPACITY) {
  if (from === to || !tubes[from]?.length || !tubes[to] || tubes[to].length >= capacity) return null;
  const source = getTopRun(tubes[from]);
  const targetColor = tubes[to].at(-1) ?? null;
  if (targetColor !== null && targetColor !== source.color) return null;
  return { from, to, color: source.color, count: Math.min(source.count, capacity - tubes[to].length) };
}

export function applyPour(tubes, plan) {
  if (!plan) return tubes.map((tube) => [...tube]);
  const next = tubes.map((tube) => [...tube]);
  next[plan.from].splice(-plan.count, plan.count);
  next[plan.to].push(...Array(plan.count).fill(plan.color));
  return next;
}

export function listLegalMoves(tubes, capacity = DEFAULT_CAPACITY) {
  const moves = [];
  for (let from = 0; from < tubes.length; from += 1) {
    for (let to = 0; to < tubes.length; to += 1) {
      const move = planPour(tubes, from, to, capacity);
      if (move) moves.push(move);
    }
  }
  return moves;
}

function moveScore(tubes, move, capacity) {
  const sourceAfter = tubes[move.from].length - move.count;
  const targetAfter = tubes[move.to].length + move.count;
  const joinsColor = tubes[move.to].length > 0 ? 20 : 0;
  const completesTube = targetAfter === capacity ? 40 : 0;
  const emptiesSource = sourceAfter === 0 ? 12 : 0;
  const emptyToEmptyPenalty = tubes[move.to].length === 0 && getTopRun(tubes[move.from]).count === tubes[move.from].length ? -30 : 0;
  return joinsColor + completesTube + emptiesSource + move.count + emptyToEmptyPenalty;
}

export function suggestMove(tubes, capacity = DEFAULT_CAPACITY) {
  return listLegalMoves(tubes, capacity)
    .map((move) => ({ move, score: moveScore(tubes, move, capacity) }))
    .sort((a, b) => b.score - a.score)[0]?.move ?? null;
}

export function isSolved(tubes, capacity = DEFAULT_CAPACITY) {
  return tubes.every((tube) => tube.length === 0 || (tube.length === capacity && tube.every((color) => color === tube[0])));
}
