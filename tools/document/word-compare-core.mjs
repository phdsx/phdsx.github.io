import { diffArrays } from '../../assets/vendor/jsdiff-8.0.3/array.js';

// Alignment routines adapted from tschnorpfeil/docdiff (1e3f29860032b6df96f2bd90c4e9b0f5a28847c0), MIT.
const ALIGN_GAP_PENALTY = -0.22;
// Middles up to this many DP cells are aligned with one global Needleman-Wunsch pass,
// exactly as before (~500 x 500 paragraphs, ≈ 20 pages against 20 pages).
const ALIGN_FULL_DP_MAX_CELLS = 80000;
// Gaps between anchors up to this size still get the exact DP; larger ones use a banded DP
// so memory stays bounded (the exact DP needs 5 bytes per cell).
const ALIGN_EXACT_DP_MAX_CELLS = 800000;

// Global Needleman-Wunsch alignment of two block lists (O(n·m) time and memory).
function alignBlocksExact(midLeft, midRight, onCells) {
  const n = midLeft.length;
  const m = midRight.length;
  if (n === 0 || m === 0) return alignBlocksTrivial(midLeft, midRight);

  const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const ptr = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  const GAP_PENALTY = ALIGN_GAP_PENALTY;

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * GAP_PENALTY;
    ptr[i][0] = 2;
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * GAP_PENALTY;
    ptr[0][j] = 3;
  }

  const reportEvery = Math.max(1, Math.floor(250000 / m));
  for (let i = 1; i <= n; i++) {
    const rowPrev = dp[i - 1];
    const row = dp[i];
    const ptrRow = ptr[i];
    const leftBlock = midLeft[i - 1];
    for (let j = 1; j <= m; j++) {
      const sim = computeBlockSimilarity(leftBlock, midRight[j - 1]);
      const matchScore = sim >= 0.28 ? sim : -0.5;
      const scoreDiag = rowPrev[j - 1] + matchScore;
      const scoreUp = rowPrev[j] + GAP_PENALTY;
      const scoreLeft = row[j - 1] + GAP_PENALTY;

      if (scoreDiag >= scoreUp && scoreDiag >= scoreLeft) {
        row[j] = scoreDiag;
        ptrRow[j] = 1;
      } else if (scoreUp >= scoreLeft) {
        row[j] = scoreUp;
        ptrRow[j] = 2;
      } else {
        row[j] = scoreLeft;
        ptrRow[j] = 3;
      }
    }
    if (onCells && i % reportEvery === 0) onCells(reportEvery * m);
  }
  if (onCells) onCells((n % reportEvery) * m);

  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const move = ptr[i][j];
    if (i > 0 && j > 0 && move === 1) {
      pairs.push({ left: midLeft[i - 1], right: midRight[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || move === 2)) {
      pairs.push({ left: midLeft[i - 1], right: null });
      i--;
    } else {
      pairs.push({ left: null, right: midRight[j - 1] });
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

function alignBlocksTrivial(midLeft, midRight) {
  const pairs = [];
  for (const b of midLeft) pairs.push({ left: b, right: null });
  for (const b of midRight) pairs.push({ left: null, right: b });
  return pairs;
}

// Same scoring as alignBlocksExact, restricted to a diagonal band so that memory and time are
// O((n + m) · band). Only used for gaps that are too large for the exact DP and have no anchors.
function alignBlocksBanded(midLeft, midRight, maxCells, onCells) {
  const n = midLeft.length;
  const m = midRight.length;
  if (n === 0 || m === 0) return alignBlocksTrivial(midLeft, midRight);

  const slope = m / n;
  const minHalf = Math.ceil(Math.max(slope, 1)) + 2;
  const half = Math.max(minHalf, Math.floor(maxCells / (2 * (n + 1))));
  const width = 2 * half + 1;
  const lo = new Int32Array(n + 1);
  const hi = new Int32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const center = Math.round(i * slope);
    lo[i] = Math.max(0, center - half);
    hi[i] = Math.min(m, center + half);
  }
  // Make consecutive bands overlap so a monotone path always exists.
  for (let i = 1; i <= n; i++) {
    if (lo[i] > hi[i - 1]) lo[i] = hi[i - 1];
  }

  const NEG = -Infinity;
  const score = new Float32Array((n + 1) * width).fill(NEG);
  const ptr = new Uint8Array((n + 1) * width);
  const at = (i, j) => (j < lo[i] || j > hi[i] ? -1 : i * width + (j - lo[i]));

  for (let j = lo[0]; j <= hi[0]; j++) {
    score[at(0, j)] = j * ALIGN_GAP_PENALTY;
    ptr[at(0, j)] = 3;
  }

  for (let i = 1; i <= n; i++) {
    const leftBlock = midLeft[i - 1];
    for (let j = lo[i]; j <= hi[i]; j++) {
      const k = at(i, j);
      if (j === 0) {
        score[k] = i * ALIGN_GAP_PENALTY;
        ptr[k] = 2;
        continue;
      }
      const kDiag = at(i - 1, j - 1);
      const kUp = at(i - 1, j);
      const kLeft = at(i, j - 1);
      let scoreDiag = NEG;
      if (kDiag >= 0 && score[kDiag] !== NEG) {
        const sim = computeBlockSimilarity(leftBlock, midRight[j - 1]);
        scoreDiag = score[kDiag] + (sim >= 0.28 ? sim : -0.5);
      }
      const scoreUp = kUp >= 0 ? score[kUp] + ALIGN_GAP_PENALTY : NEG;
      const scoreLeft = kLeft >= 0 ? score[kLeft] + ALIGN_GAP_PENALTY : NEG;
      if (scoreDiag >= scoreUp && scoreDiag >= scoreLeft) {
        score[k] = scoreDiag;
        ptr[k] = 1;
      } else if (scoreUp >= scoreLeft) {
        score[k] = scoreUp;
        ptr[k] = 2;
      } else {
        score[k] = scoreLeft;
        ptr[k] = 3;
      }
    }
    if (onCells) onCells(hi[i] - lo[i] + 1);
  }

  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const move = ptr[at(i, j)];
    if (i > 0 && j > 0 && move === 1) {
      pairs.push({ left: midLeft[i - 1], right: midRight[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || move === 2)) {
      pairs.push({ left: midLeft[i - 1], right: null });
      i--;
    } else {
      pairs.push({ left: null, right: midRight[j - 1] });
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

// Patience-style anchors: blocks whose text (ignoring renumbering) occurs exactly once on each side, reduced to the
// longest chain that is increasing on both sides. Returns [[leftIdx, rightIdx], ...].
function findUniqueBlockAnchors(midLeft, midRight) {
  const leftCount = new Map();
  for (let i = 0; i < midLeft.length; i++) {
    const key = blockAlignKey(midLeft[i]);
    leftCount.set(key, leftCount.has(key) ? -1 : i);
  }
  const rightIndex = new Map();
  for (let j = 0; j < midRight.length; j++) {
    const key = blockAlignKey(midRight[j]);
    rightIndex.set(key, rightIndex.has(key) ? -1 : j);
  }

  const candidates = [];
  for (let i = 0; i < midLeft.length; i++) {
    const key = blockAlignKey(midLeft[i]);
    if (leftCount.get(key) !== i) continue;
    const j = rightIndex.get(key);
    if (j === undefined || j < 0) continue;
    if (midLeft[i].isHeaderFooter !== midRight[j].isHeaderFooter) continue;
    candidates.push([i, j]);
  }
  if (candidates.length === 0) return [];

  // Longest increasing subsequence on the right index (left indices are already increasing).
  const tails = [];
  const prev = new Int32Array(candidates.length).fill(-1);
  for (let c = 0; c < candidates.length; c++) {
    const j = candidates[c][1];
    let loIdx = 0;
    let hiIdx = tails.length;
    while (loIdx < hiIdx) {
      const mid = (loIdx + hiIdx) >> 1;
      if (candidates[tails[mid]][1] < j) loIdx = mid + 1;
      else hiIdx = mid;
    }
    if (loIdx > 0) prev[c] = tails[loIdx - 1];
    tails[loIdx] = c;
  }
  const chain = [];
  for (let c = tails[tails.length - 1]; c >= 0; c = prev[c]) chain.push(candidates[c]);
  chain.reverse();
  return chain;
}

// Aligns the differing middle of two documents. Small and medium middles use one global DP
// (identical to the historical behaviour); very long ones are first split at unique identical
// blocks so the DP only runs inside the gaps between them.
function alignMiddleBlocks(midLeft, midRight, onProgress) {
  const n = midLeft.length;
  const m = midRight.length;
  const totalCells = n * m;
  let doneCells = 0;
  let lastReported = -1;
  const onCells = onProgress
    ? cells => {
        doneCells += cells;
        const frac = totalCells ? Math.min(1, doneCells / totalCells) : 1;
        if (frac - lastReported >= 0.02) {
          lastReported = frac;
          onProgress(frac);
        }
      }
    : null;

  if (totalCells <= ALIGN_FULL_DP_MAX_CELLS) {
    return alignBlocksExact(midLeft, midRight, onCells);
  }

  const anchors = findUniqueBlockAnchors(midLeft, midRight);
  // Progress is measured against the cells that will actually be computed.
  let plannedCells = 0;
  let pi = 0;
  let pj = 0;
  for (const [ai, aj] of anchors.concat([[n, m]])) {
    const cells = (ai - pi) * (aj - pj);
    plannedCells += cells <= ALIGN_EXACT_DP_MAX_CELLS ? cells : Math.min(cells, ALIGN_EXACT_DP_MAX_CELLS * 2);
    pi = ai + 1;
    pj = aj + 1;
  }
  const scale = plannedCells > 0 ? totalCells / plannedCells : 1;
  const scaledOnCells = onCells ? cells => onCells(cells * scale) : null;
  const alignGapScaled = (gapLeft, gapRight) => {
    const cells = gapLeft.length * gapRight.length;
    if (cells <= ALIGN_EXACT_DP_MAX_CELLS) return alignBlocksExact(gapLeft, gapRight, scaledOnCells);
    return alignBlocksBanded(gapLeft, gapRight, ALIGN_EXACT_DP_MAX_CELLS, scaledOnCells);
  };

  const pairs = [];
  let prevI = 0;
  let prevJ = 0;
  for (const [ai, aj] of anchors) {
    for (const p of alignGapScaled(midLeft.slice(prevI, ai), midRight.slice(prevJ, aj))) pairs.push(p);
    pairs.push({ left: midLeft[ai], right: midRight[aj] });
    prevI = ai + 1;
    prevJ = aj + 1;
  }
  for (const p of alignGapScaled(midLeft.slice(prevI), midRight.slice(prevJ))) pairs.push(p);
  if (onProgress) onProgress(1);
  return pairs;
}


'use strict';

const words = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;

function tokens(text) {
  if (words) return Array.from(words.segment(text), entry => entry.segment);
  return text.match(/\p{Script=Han}|[\p{L}\p{N}\p{M}]+|\s+|[^]/gu) || [];
}

function blockAlignKey(block) {
  return block.key;
}

function features(block) {
  if (block.kind === 'graphic') return { value: block, kind: block.kind, key: `graphic\u001d${block.type}\u001d${block.fingerprint}` };
  const key = `${block.kind}\u001d${block.text.normalize('NFC').replace(/\s+/g, ' ').trim()}`;
  const source = block.text.length > 900 ? `${block.text.slice(0, 600)} ${block.text.slice(-300)}` : block.text;
  const cleaned = source.normalize('NFC').toLowerCase().replace(/[\u001e\u001f]/g, ' ');
  const terms = tokens(cleaned).filter(token => /[\p{L}\p{N}]/u.test(token)).slice(0, 130);
  const counts = new Map();
  for (const term of terms) counts.set(term, (counts.get(term) || 0) + 1);
  return { value: block, kind: block.kind, key, counts, length: terms.length };
}

function computeBlockSimilarity(a, b) {
  if (a.kind !== b.kind) return 0;
  if (a.key === b.key) return 1.12;
  if (a.kind === 'graphic') return a.value.type === b.value.type ? (a.value.description && a.value.description === b.value.description ? 0.72 : 0.37) : 0;
  if (!a.length || !b.length || 2 * Math.min(a.length, b.length) < 0.28 * (a.length + b.length)) return 0;
  const [small, large] = a.counts.size <= b.counts.size ? [a.counts, b.counts] : [b.counts, a.counts];
  let shared = 0;
  for (const [term, count] of small) shared += Math.min(count, large.get(term) || 0);
  return 2 * shared / (a.length + b.length);
}

function pairSequence(leftItems, rightItems, progress, sameKindReplacement = false) {
  const left = leftItems.map(features);
  const right = rightItems.map(features);
  let first = 0;
  let lastLeft = left.length;
  let lastRight = right.length;
  while (first < lastLeft && first < lastRight && left[first].key === right[first].key) first++;
  while (lastLeft > first && lastRight > first && left[lastLeft - 1].key === right[lastRight - 1].key) {
    lastLeft--;
    lastRight--;
  }
  const output = [];
  for (let i = 0; i < first; i++) output.push({ left: leftItems[i], right: rightItems[i] });
  const middle = alignMiddleBlocks(left.slice(first, lastLeft), right.slice(first, lastRight), progress);
  for (let i = 0; i < middle.length;) {
    const pair = middle[i];
    if (pair.left && pair.right) {
      output.push({ left: pair.left.value, right: pair.right.value });
      i++;
      continue;
    }
    let end = i + 1;
    while (end < middle.length && !(middle[end].left && middle[end].right)) end++;
    if (sameKindReplacement && end === i + 2) {
      const other = middle[i + 1];
      const l = pair.left || other.left;
      const r = pair.right || other.right;
      if (l && r && l.kind === r.kind && l.kind !== 'graphic' && (l.kind !== 'table' || l.value.columns === r.value.columns)) {
        output.push({ left: l.value, right: r.value });
        i = end;
        continue;
      }
    }
    for (; i < end; i++) output.push({ left: middle[i].left?.value || null, right: middle[i].right?.value || null });
  }
  for (let i = lastLeft, j = lastRight; i < left.length; i++, j++) output.push({ left: leftItems[i], right: rightItems[j] });
  return output;
}

function splitText(left, right) {
  if (Math.max(left.length, right.length) <= 16000) return splitWords(left, right);

  // Limit word segmentation on very long runs while preserving all source text.
  let start = 0;
  let endLeft = left.length;
  let endRight = right.length;
  while (start < endLeft && start < endRight && left[start] === right[start]) start++;
  if (left.charCodeAt(start - 1) >= 0xd800 && left.charCodeAt(start - 1) <= 0xdbff) start--;
  while (endLeft > start && endRight > start && left[endLeft - 1] === right[endRight - 1]) {
    endLeft--;
    endRight--;
  }
  if (left.charCodeAt(endLeft) >= 0xdc00 && left.charCodeAt(endLeft) <= 0xdfff) {
    endLeft++;
    endRight++;
  }
  const a = left.slice(start, endLeft);
  const b = right.slice(start, endRight);
  const inner = Math.max(a.length, b.length) <= 16000 ? splitWords(a, b) : {
    left: [{ text: a, changed: true }], right: [{ text: b, changed: true }],
  };
  return {
    left: [{ text: left.slice(0, start), changed: false }, ...inner.left, { text: left.slice(endLeft), changed: false }].filter(p => p.text),
    right: [{ text: right.slice(0, start), changed: false }, ...inner.right, { text: right.slice(endRight), changed: false }].filter(p => p.text),
  };
}

function splitWords(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  let start = 0;
  let endA = a.length;
  let endB = b.length;
  while (start < endA && start < endB && a[start] === b[start]) start++;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const middleA = a.slice(start, endA);
  const middleB = b.slice(start, endB);
  const components = diffArrays(middleA, middleB, { timeout: 80, maxEditLength: 2600 }) || [
    { value: middleA, removed: true }, { value: middleB, added: true },
  ];
  const parts = { left: [], right: [] };
  function add(side, value, changed) {
    if (!value.length) return;
    const items = parts[side];
    if (items.at(-1)?.changed === changed) items.at(-1).text += value;
    else items.push({ text: value, changed });
  }
  const prefix = a.slice(0, start).join('');
  add('left', prefix, false);
  add('right', prefix, false);
  for (const component of components) {
    const value = component.value.join('');
    if (!component.added) add('left', value, Boolean(component.removed));
    if (!component.removed) add('right', value, Boolean(component.added));
  }
  const suffix = a.slice(endA).join('');
  add('left', suffix, false);
  add('right', suffix, false);
  return parts;
}

function difference(left, right) {
  if (left === null) return 'insert';
  if (right === null) return 'delete';
  return left === right ? null : 'modify';
}

function sideParts(left, right, type) {
  if (type === 'modify') return splitText(left, right);
  return {
    left: left === null ? [] : [{ text: left, changed: type === 'delete' }],
    right: right === null ? [] : [{ text: right, changed: type === 'insert' }],
  };
}

function columnAlignment(left, right, rows) {
  if (!left || !right || left.columns === right.columns) return null;
  const regular = table => table.columns <= 120 && table.rows.every(row =>
    row.cells.length === table.columns && row.cells.every((cell, index) => cell.column === index && cell.span === 1));
  if (!regular(left) || !regular(right)) return null;
  const columns = (table, side) => Array.from({ length: table.columns }, (_, index) => ({
    kind: 'column', index, text: rows.filter(pair => pair.left && pair.right)
      .map(pair => pair[side].cells[index].text).join('\u001f'),
  }));
  return pairSequence(columns(left, 'left'), columns(right, 'right'), null, true)
    .map(pair => [pair.left?.index, pair.right?.index]);
}

export function compareDocuments(leftDoc, rightDoc, report) {
  const rows = [];
  const changes = [];
  function register(row, type, oldText, newText, left, right, category = 'text') {
    if (!type) return null;
    const change = { id: changes.length + 1, row: row.index, type, category, oldText, newText,
      leftLocation: left?.position || '', rightLocation: right?.position || '',
      section: right?.section || left?.section || '' };
    changes.push(change);
    row.changes.push(change.id);
    return change.id;
  }

  const pairs = pairSequence(leftDoc.blocks, rightDoc.blocks, report, true);
  for (const { left, right } of pairs) {
    if ((left || right).kind === 'graphic') {
      const type = difference(left?.fingerprint ?? null, right?.fingerprint ?? null);
      const row = { index: rows.length, kind: 'graphic', left, right, changes: [] };
      row.change = register(row, type, left?.title, right?.title, left, right, 'graphic');
      rows.push(row);
      continue;
    }
    if ((left || right).kind !== 'table') {
      const oldText = left?.text ?? null;
      const newText = right?.text ?? null;
      const type = difference(oldText, newText);
      const row = { index: rows.length, kind: 'paragraph', left, right, parts: sideParts(oldText, newText, type), changes: [] };
      row.change = register(row, type, oldText, newText, left, right);
      rows.push(row);
      continue;
    }

    const asRows = table => (table?.rows || []).map(item => ({ ...item, kind: 'tableRow', text: item.cells.map(cell => cell.text).join('\u001f') }));
    const tablePairs = pairSequence(asRows(left), asRows(right), null, true);
    const columns = columnAlignment(left, right, tablePairs);
    for (const pair of tablePairs) {
      const leftCells = pair.left?.cells || [];
      const rightCells = pair.right?.cells || [];
      const row = { index: rows.length, kind: 'table', changes: [], cells: [],
        left: pair.left && { ...pair.left, table: left.position, columns: left.columns, last: pair.left.number === left.rows.length },
        right: pair.right && { ...pair.right, table: right.position, columns: right.columns, last: pair.right.number === right.rows.length } };
      const rowColumns = columns || [...new Set([...leftCells, ...rightCells].map(c => c.column))]
        .sort((a, b) => a - b).map(column => [column, column]);
      const leftByColumn = new Map(leftCells.map(cell => [cell.column, cell]));
      const rightByColumn = new Map(rightCells.map(cell => [cell.column, cell]));
      for (const [leftColumn, rightColumn] of rowColumns) {
        const oldCell = leftByColumn.get(leftColumn) || null;
        const newCell = rightByColumn.get(rightColumn) || null;
        if (!oldCell && !newCell) continue;
        const oldText = oldCell?.text ?? null;
        const newText = newCell?.text ?? null;
        const type = difference(oldText, newText);
        const leftAt = oldCell && { section: left.section, position: `${left.position} · 第 ${pair.left.number} 行，第 ${leftColumn + 1} 列` };
        const rightAt = newCell && { section: right.section, position: `${right.position} · 第 ${pair.right.number} 行，第 ${rightColumn + 1} 列` };
        const change = register(row, type, oldText, newText, leftAt, rightAt);
        row.cells.push({ left: oldCell, right: newCell, parts: sideParts(oldText, newText, type), change });
      }
      rows.push(row);
    }
  }
  return { rows, changes };
}
