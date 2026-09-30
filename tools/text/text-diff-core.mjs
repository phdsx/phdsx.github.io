import { diffArrays } from '../../assets/vendor/jsdiff-8.0.3/array.js';

export const LIMITS = Object.freeze({ characters: 200000, lines: 5000, lineLength: 20000, timeout: 6000 });
export const RULES = Object.freeze({
  none: { label: '不处理', description: '保留并比较所有空白。' },
  spaces: { label: '去除普通空格', description: '仅移除半角空格 U+0020，保留换行、制表符与全角空格。' },
  trim: { label: '去除每行首尾空白', description: '移除每行两端的 Unicode 空白，保留行内空白与换行。' },
  all: { label: '去除全部空白', description: '移除 Unicode 空白及 BOM，包括空格、制表符、换行与全角空格。' }
});

export function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

export function preprocess(text, rule = 'none') {
  if (!Object.hasOwn(RULES, rule)) throw new Error('未知的空白处理规则。');
  const normalized = normalizeNewlines(text);
  if (rule === 'spaces') return normalized.replace(/ /g, '');
  if (rule === 'trim') return normalized.split('\n').map(line => line.replace(/^[\p{White_Space}\uFEFF]+|[\p{White_Space}\uFEFF]+$/gu, '')).join('\n');
  if (rule === 'all') return normalized.replace(/[\p{White_Space}\uFEFF]/gu, '');
  return normalized;
}

export function validateText(text, name = '文本') {
  if (text.length > LIMITS.characters) throw new Error(`${name}超过 ${LIMITS.characters.toLocaleString('en-US')} 个 UTF-16 字符单位上限。请缩短文本后重试；未进行截断。`);
  const lines = text.split('\n');
  if (lines.length > LIMITS.lines) throw new Error(`${name}超过 ${LIMITS.lines.toLocaleString('en-US')} 行上限。请分段比对；未进行截断。`);
  if (lines.some(line => line.length > LIMITS.lineLength)) throw new Error(`${name}单行超过 ${LIMITS.lineLength.toLocaleString('en-US')} 个 UTF-16 字符单位。请分段比对；未进行截断。`);
}

let segmenter;
export function graphemes(text) {
  if (typeof Intl.Segmenter !== 'function') throw new Error('浏览器不支持 Unicode 字素分割，请使用新版 Chrome、Edge、Firefox 或 Safari。');
  segmenter ||= new Intl.Segmenter('zh', { granularity: 'grapheme' });
  const tokens = [];
  for (const item of segmenter.segment(text)) tokens.push(item.segment);
  return tokens;
}

function compareTokens(left, right, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('文本变化过于复杂，计算超过 6 秒。请分段比对；尚未生成完整结果。');
  const changes = diffArrays(left, right, { timeout: remaining });
  if (!changes) throw new Error('文本变化过于复杂，计算超过 6 秒。请分段比对；尚未生成完整结果。');
  return changes;
}

function inlineDiff(left, right, deadline) {
  const leftParts = [], rightParts = [];
  for (const change of compareTokens(graphemes(left), graphemes(right), deadline)) {
    const text = change.value.join('');
    if (!change.added) leftParts.push({ text, kind: change.removed ? 'delete' : 'equal' });
    if (!change.removed) rightParts.push({ text, kind: change.added ? 'add' : 'equal' });
  }
  return [leftParts, rightParts];
}

// Diff whole lines first, then graphemes in paired replacement lines. Empty strings
// have no lines; a terminal LF creates an explicit final empty line in the result.
export function compareTexts(original, comparison, rule = 'none') {
  validateText(original, '原始文本');
  validateText(comparison, '对比文本');
  const leftText = preprocess(original, rule), rightText = preprocess(comparison, rule);
  validateText(leftText, '处理后的原始文本');
  validateText(rightText, '处理后的对比文本');
  const deadline = Date.now() + LIMITS.timeout;
  const leftLines = leftText === '' ? [] : leftText.split('\n');
  const rightLines = rightText === '' ? [] : rightText.split('\n');
  const changes = compareTokens(leftLines, rightLines, deadline);
  const rows = [], blocks = [], stats = { added: 0, deleted: 0, modified: 0 };
  let leftNumber = 1, rightNumber = 1;
  const side = (number, text, segments = [{ text, kind: 'equal' }]) => ({ number, text, segments });
  for (let index = 0; index < changes.length;) {
    const change = changes[index];
    if (!change.added && !change.removed) {
      for (const text of change.value) rows.push({ kind: 'equal', block: null, left: side(leftNumber++, text), right: side(rightNumber++, text) });
      index++;
      continue;
    }
    const deleted = [], added = [];
    while (index < changes.length && (changes[index].added || changes[index].removed)) {
      const part = changes[index++];
      for (const text of part.value) (part.removed ? deleted : added).push(text);
    }
    const block = { index: blocks.length, start: rows.length, oldStart: leftNumber, newStart: rightNumber, deleted: deleted.length, added: added.length };
    for (let offset = 0; offset < Math.max(deleted.length, added.length); offset++) {
      const hasLeft = offset < deleted.length, hasRight = offset < added.length;
      const kind = hasLeft && hasRight ? 'modify' : hasLeft ? 'delete' : 'add';
      let left = null, right = null;
      if (kind === 'modify') {
        const [leftParts, rightParts] = inlineDiff(deleted[offset], added[offset], deadline);
        left = side(leftNumber++, deleted[offset], leftParts);
        right = side(rightNumber++, added[offset], rightParts);
        stats.modified++;
      } else if (hasLeft) {
        left = side(leftNumber++, deleted[offset], [{ text: deleted[offset], kind: 'delete' }]);
        stats.deleted++;
      } else {
        right = side(rightNumber++, added[offset], [{ text: added[offset], kind: 'add' }]);
        stats.added++;
      }
      rows.push({ kind, block: block.index, left, right });
    }
    block.end = rows.length;
    blocks.push(block);
  }
  return { rule, rows, blocks, stats, identical: leftText === rightText, normalizedIdentical: normalizeNewlines(original) === normalizeNewlines(comparison) };
}

export function equalityMessage(result) {
  return result.normalizedIdentical ? '文本一致' : '按当前空白处理规则，两段文本一致';
}

// Bound both DOM row count and rendered text size; every row remains reachable.
export function paginateRows(rows, rowLimit = 100, characterLimit = 40000) {
  const pages = [];
  let start = 0, size = 0;
  for (let index = 0; index < rows.length; index++) {
    const length = (rows[index].left?.text.length || 0) + (rows[index].right?.text.length || 0);
    if (index > start && (index - start >= rowLimit || size + length > characterLimit)) {
      pages.push({ start, end: index }); start = index; size = 0;
    }
    size += length;
  }
  if (start < rows.length) pages.push({ start, end: rows.length });
  return pages;
}

export function makeReport(result) {
  const lines = ['文本差异比对报告', `空白处理规则：${RULES[result.rule].label}`, RULES[result.rule].description,
    '比较前已将 CRLF 统一为 LF；未转换大小写或标点。',
    result.rule === 'none' ? '比对结果（换行已统一）' : '处理后的比对结果（不代表输入框原文）',
    `差异块：${result.blocks.length}；新增行：${result.stats.added}；删除行：${result.stats.deleted}；修改行：${result.stats.modified}`,
    '统计：连续变化算一个差异块；块内删除与新增行按顺序配对为修改。',
    '标记：= 相同；- 删除或修改前；+ 新增或修改后；行号分别对应两侧。末尾空行保留。', ''];
  if (result.identical) lines.push(equalityMessage(result), '');
  let lastBlock = null;
  for (const row of result.rows) {
    if (row.block !== null && row.block !== lastBlock) lines.push(`--- 差异块 ${row.block + 1} ---`);
    lastBlock = row.block;
    if (row.kind === 'equal') lines.push(`= 原始 ${row.left.number} / 对比 ${row.right.number} | ${row.left.text}`);
    else {
      if (row.left) lines.push(`- 原始 ${row.left.number} | ${row.left.text}`);
      if (row.right) lines.push(`+ 对比 ${row.right.number} | ${row.right.text}`);
    }
  }
  return lines.join('\n') + '\n';
}
