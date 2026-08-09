import { applyPour, isSolved, planPour } from './sand-sort-rules.mjs';

export const COLOR_IDS = ['pink', 'orange', 'blue', 'green', 'violet', 'yellow', 'cyan', 'red', 'lime', 'brown'];

export const LEVEL_BLUEPRINTS = [
  { seed: 1101, colors: 2, empties: 2, steps: 6 },
  { seed: 1109, colors: 2, empties: 2, steps: 8 },
  { seed: 1123, colors: 3, empties: 2, steps: 10 },
  { seed: 1151, colors: 3, empties: 2, steps: 12 },
  { seed: 1181, colors: 3, empties: 2, steps: 14 },
  { seed: 1201, colors: 4, empties: 2, steps: 15 },
  { seed: 1217, colors: 4, empties: 2, steps: 17 },
  { seed: 1237, colors: 4, empties: 2, steps: 19 },
  { seed: 1277, colors: 4, empties: 2, steps: 21 },
  { seed: 1301, colors: 5, empties: 2, steps: 22 },
  { seed: 1321, colors: 5, empties: 2, steps: 24 },
  { seed: 1361, colors: 5, empties: 2, steps: 26 },
  { seed: 1381, colors: 5, empties: 2, steps: 28 },
  { seed: 1423, colors: 6, empties: 2, steps: 28 },
  { seed: 1451, colors: 6, empties: 2, steps: 30 },
  { seed: 1481, colors: 6, empties: 2, steps: 32 },
  { seed: 1523, colors: 6, empties: 2, steps: 34 },
  { seed: 1559, colors: 6, empties: 2, steps: 36 },
  { seed: 1601, colors: 7, empties: 2, steps: 34 },
  { seed: 1621, colors: 7, empties: 2, steps: 36 },
  { seed: 1657, colors: 7, empties: 2, steps: 38 },
  { seed: 1693, colors: 7, empties: 2, steps: 40 },
  { seed: 1721, colors: 7, empties: 2, steps: 42 },
  { seed: 1753, colors: 7, empties: 2, steps: 44 },
  { seed: 1801, colors: 8, empties: 2, steps: 40 },
  { seed: 1831, colors: 8, empties: 2, steps: 42 },
  { seed: 1861, colors: 8, empties: 2, steps: 44 },
  { seed: 1901, colors: 8, empties: 2, steps: 46 },
  { seed: 1931, colors: 8, empties: 2, steps: 48 },
  { seed: 1973, colors: 8, empties: 2, steps: 50 },
];

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function reverseCandidates(tubes, capacity) {
  const candidates = [];
  for (let from = 0; from < tubes.length; from += 1) {
    if (!tubes[from].length) continue;
    const color = tubes[from].at(-1);
    let run = 1;
    while (run < tubes[from].length && tubes[from].at(-1 - run) === color) run += 1;
    const mayExposeDifferent = run < tubes[from].length;
    const maxAmount = mayExposeDifferent ? run - 1 : run;
    for (let to = 0; to < tubes.length; to += 1) {
      if (to === from || tubes[to].length >= capacity) continue;
      if (tubes[to].at(-1) === color) continue;
      for (let count = 1; count <= Math.min(maxAmount, capacity - tubes[to].length); count += 1) {
        candidates.push({ from, to, color, count });
      }
    }
  }
  return candidates;
}

function scramble(blueprint, variation) {
  const capacity = 4;
  const colors = COLOR_IDS.slice(0, blueprint.colors);
  let tubes = [...colors.map((color) => Array(capacity).fill(color)), ...Array.from({ length: blueprint.empties }, () => [])];
  const random = mulberry32(blueprint.seed + variation * 10007);
  const inverse = [];
  for (let step = 0; step < blueprint.steps; step += 1) {
    const candidates = reverseCandidates(tubes, capacity);
    const move = candidates[Math.floor(random() * candidates.length)];
    if (!move) break;
    const next = tubes.map((tube) => [...tube]);
    next[move.from].splice(-move.count, move.count);
    next[move.to].push(...Array(move.count).fill(move.color));
    tubes = next;
    inverse.unshift({ from: move.to, to: move.from });
  }
  return { tubes, inverse, colors, capacity };
}

export function createLevel(index, variation = 0) {
  const blueprint = LEVEL_BLUEPRINTS[index];
  if (!blueprint) throw new RangeError(`Unknown level index: ${index}`);
  const generated = scramble(blueprint, variation);
  return { id: index + 1, ...generated, solution: generated.inverse };
}

export function verifySolution(level) {
  let tubes = level.tubes.map((tube) => [...tube]);
  for (const step of level.solution) {
    const move = planPour(tubes, step.from, step.to, level.capacity);
    if (!move) return false;
    tubes = applyPour(tubes, move);
  }
  return isSolved(tubes, level.capacity);
}
