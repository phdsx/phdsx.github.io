import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { LIMITS, RULES, normalizeNewlines, preprocess, graphemes, compareTexts, equalityMessage, paginateRows, makeReport } from '../tools/text/text-diff-core.mjs';

const compare = (a, b, rule = 'none') => compareTexts(a, b, rule);
const reconstruct = (result, side) => result.rows.filter(row => row[side]).map(row => row[side].text).join('\n');
const changedText = (row, side) => row[side].segments.filter(part => part.kind !== 'equal').map(part => part.text).join('');

test('identical text and empty text have no differences', () => {
  for (const text of ['', '中文 English 123，👩🏽‍💻！', '重复\n重复\n', ' \t\n\u3000']) {
    const result = compare(text, text);
    assert.equal(result.identical, true); assert.equal(result.blocks.length, 0);
    assert.equal(equalityMessage(result), '文本一致');
    assert.equal(reconstruct(result, 'left'), text);
  }
});

test('middle character insertion/deletion preserve the common suffix', () => {
  for (const [a, b, changed] of [['甲乙丙丁', '甲乙新丙丁', '新'], ['abcdef', 'abcXdef', 'X'], ['123,456!', '123,💡456!', '💡']]) {
    const inserted = compare(a, b), removed = compare(b, a);
    assert.equal(inserted.blocks.length, 1); assert.equal(inserted.rows.length, 1);
    assert.equal(changedText(inserted.rows[0], 'right'), changed);
    assert.equal(changedText(inserted.rows[0], 'left'), '');
    assert.equal(changedText(removed.rows[0], 'left'), changed);
    assert.equal(inserted.rows[0].left.segments.at(-1).kind, 'equal');
  }
});

test('a modified line and continuous added/deleted lines align following lines', () => {
  const result = compare('开头\n中间 A\n结尾', '开头\n中间 B\n新增一\n新增二\n结尾');
  assert.deepEqual(result.stats, { added: 2, deleted: 0, modified: 1 });
  assert.equal(result.blocks.length, 1);
  assert.equal(result.rows.at(-1).kind, 'equal');
  assert.equal(result.rows.at(-1).left.number, 3); assert.equal(result.rows.at(-1).right.number, 5);
  const deleted = compare('开头\n旧一\n旧二\n结尾', '开头\n结尾');
  assert.equal(deleted.stats.deleted, 2); assert.equal(deleted.blocks.length, 1);
});

test('separated changes form separate blocks; counts are line counts', () => {
  const result = compare('a\nb\nc\nd', 'A\nb\nC\nd');
  assert.equal(result.blocks.length, 2); assert.equal(result.stats.modified, 2);
  assert.deepEqual(result.blocks.map(block => [block.start, block.end]), [[0, 1], [2, 3]]);
});

test('repeated lines and repeated paragraphs produce bounded, reconstructable changes', () => {
  for (const [a, b] of [['标题\n重复\n重复\n结尾', '标题\n重复\n新增\n重复\n结尾'],
    ['段落甲\n段落乙\n\n段落甲\n段落乙\n末尾', '段落甲\n段落乙\n\n段落甲\n修改乙\n末尾']]) {
    const result = compare(a, b);
    assert.equal(result.blocks.length, 1); assert.equal(result.rows.at(-1).kind, 'equal');
    assert.equal(reconstruct(result, 'left'), a); assert.equal(reconstruct(result, 'right'), b);
  }
});

test('one empty side is entirely additions or deletions', () => {
  const added = compare('', '中文\n\n👨‍👩‍👧‍👦');
  assert.equal(added.stats.added, 3); assert.equal(added.stats.modified, 0);
  assert.ok(added.rows.every(row => row.left === null));
  const deleted = compare('a\nb', ''); assert.equal(deleted.stats.deleted, 2);
});

test('terminal newline and blank line differences remain visible', () => {
  const result = compare('a', 'a\n');
  assert.equal(result.stats.added, 1); assert.equal(result.rows[1].right.text, '');
  assert.equal(compare('', '\n').stats.added, 2);
  assert.equal(compare(' ', '\t').identical, false);
});

test('graphemes preserve ZWJ families, skin tones, flags, modifiers and combining accents', () => {
  for (const cluster of ['👩🏽‍💻', '👨‍👩‍👧‍👦', '🇨🇳', '👍🏿', 'e\u0301', '1️⃣', '❤️']) {
    assert.deepEqual(graphemes(cluster), [cluster]);
    const result = compare(`前${cluster}后`, '前💡后');
    assert.equal(changedText(result.rows[0], 'left'), cluster);
    assert.equal(changedText(result.rows[0], 'right'), '💡');
  }
});

test('Chinese comparisons use characters without needing English spaces', () => {
  const row = compare('这是中文标点，测试。', '这是中文标点！测试。').rows[0];
  assert.equal(changedText(row, 'left'), '，'); assert.equal(changedText(row, 'right'), '！');
});

test('CRLF and LF are unified, while bare CR is preserved', () => {
  assert.equal(normalizeNewlines('a\r\nb\r\n'), 'a\nb\n');
  assert.equal(compare('a\r\nb\r\n', 'a\nb\n').identical, true);
  assert.equal(preprocess('a\rb', 'none'), 'a\rb');
  assert.equal(compare('a\rb', 'ab').identical, false);
});

test('none retains whitespace, casing, punctuation and Unicode normalization', () => {
  const text = ' A  b\t\u3000\u00a0\u0085\n C ';
  assert.equal(preprocess(text), text);
  for (const [a, b] of [['A', 'a'], [',', '，'], ['é', 'e\u0301'], ['x\u200b', 'x']]) assert.equal(compare(a, b, 'all').identical, false);
});

test('spaces removes only U+0020, preserving tabs, fullwidth spaces and LF', () => {
  assert.equal(preprocess(' A B\t\u3000\r\n C ', 'spaces'), 'AB\t\u3000\nC');
  assert.equal(compare('a b', 'ab', 'spaces').identical, true);
  assert.equal(compare('a\tb', 'ab', 'spaces').identical, false);
  assert.equal(compare('a\u3000b', 'ab', 'spaces').identical, false);
  assert.equal(compare('a\nb', 'ab', 'spaces').identical, false);
});

test('trim removes Unicode edge whitespace but preserves inline whitespace and line count', () => {
  assert.equal(preprocess(' \t甲 乙\t\u3000\r\n\u00a0丙 丁 \n \t', 'trim'), '甲 乙\n丙 丁\n');
  assert.equal(compare(' 甲 \n 乙 ', '甲\n乙', 'trim').identical, true);
  assert.equal(compare('甲 乙', '甲乙', 'trim').identical, false);
  assert.equal(preprocess('\n\n', 'trim'), '\n\n');
});

test('all removes the Unicode White_Space set plus BOM, without removing ZWJ or zero-width space', () => {
  const whitespace = ' \t\n\r\v\f\u0085\u00a0\u1680\u2000\u2007\u2028\u2029\u202f\u205f\u3000\ufeff';
  assert.equal(preprocess(`甲${whitespace}乙`, 'all'), '甲乙');
  assert.equal(preprocess('👩‍💻\u200b', 'all'), '👩‍💻\u200b');
  assert.equal(compare(whitespace, '', 'all').identical, true);
});

test('equality distinguishes whitespace-equivalence from original equality', () => {
  assert.equal(equalityMessage(compare('a b', 'ab', 'spaces')), '按当前空白处理规则，两段文本一致');
  assert.equal(equalityMessage(compare('ab', 'ab', 'all')), '文本一致');
  assert.equal(equalityMessage(compare('a\r\n', 'a\n', 'none')), '文本一致');
});

test('processed indices are attached to processed text, and original strings are unchanged', () => {
  const a = '  甲 乙  ', b = '甲 丙', result = compare(a, b, 'spaces');
  assert.equal(a, '  甲 乙  '); assert.equal(b, '甲 丙');
  assert.equal(result.rows[0].left.text, '甲乙');
  assert.equal(changedText(result.rows[0], 'left'), '乙'); assert.equal(changedText(result.rows[0], 'right'), '丙');
});

test('unknown rules are rejected, including inherited property names', () => {
  for (const rule of ['other', '__proto__', 'constructor']) assert.throws(() => compare('a', 'b', rule), /未知/);
});

test('length, line and processed-line limits reject input without truncation', () => {
  assert.throws(() => compare('a'.repeat(LIMITS.characters + 1), ''), /200,000.*未进行截断/);
  assert.throws(() => compare('\n'.repeat(LIMITS.lines), ''), /5,000.*未进行截断/);
  assert.throws(() => compare('a'.repeat(LIMITS.lineLength + 1), ''), /单行.*未进行截断/);
  const manyLines = ('a'.repeat(101) + '\n').repeat(200);
  assert.throws(() => compare(manyLines, '', 'all'), /处理后的原始文本单行/);
});

test('computation time limit yields an explicit error, never a partial result', () => {
  const clock = Date.now; let calls = 0;
  try { Date.now = () => calls++ === 0 ? 0 : LIMITS.timeout + 1; assert.throws(() => compare('a', 'b'), /尚未生成完整结果/); }
  finally { Date.now = clock; }
});

test('missing grapheme support fails explicitly instead of splitting Emoji', () => {
  const saved = Intl.Segmenter;
  try { Intl.Segmenter = undefined; assert.throws(() => compare('👩‍💻', '👨‍💻'), /字素分割/); }
  finally { Intl.Segmenter = saved; }
});

test('pagination bounds rows and characters; all rows remain reachable', () => {
  const result = compare(Array.from({ length: 350 }, (_, i) => `行${i}`).join('\n'), '');
  const pages = paginateRows(result.rows);
  assert.equal(pages.length, 4); assert.equal(pages[0].start, 0); assert.equal(pages.at(-1).end, 350);
  assert.ok(pages.every(page => page.end - page.start <= 100));
  const longRows = compare(('x'.repeat(19000) + '\n').repeat(4), '');
  const smallPages = paginateRows(longRows.rows); assert.ok(smallPages.length >= 2);
  assert.ok(smallPages.every((page, i) => i === 0 || page.start === smallPages[i - 1].end));
});

test('large nearly equal input stays aligned', () => {
  const a = Array.from({ length: 4500 }, (_, i) => `${i} 中文 English 重复内容`).join('\n');
  const result = compare(a, a.replace('2250 中文', '2250 新中文'));
  assert.equal(result.blocks.length, 1); assert.equal(result.stats.modified, 1);
  assert.equal(reconstruct(result, 'left'), a);
});

test('deterministic randomized edits reconstruct both processed inputs', () => {
  let seed = 2147;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const tokens = ['甲', '乙', ' a ', '\t', '👩🏽‍💻', '', '重复', '<script>'];
  for (let trial = 0; trial < 80; trial++) {
    const a = Array.from({ length: 15 }, () => tokens[random(tokens.length)]);
    const b = [...a]; b.splice(random(15), random(3), tokens[random(tokens.length)]);
    const left = a.join('\n'), right = b.join('\n');
    for (const rule of Object.keys(RULES)) {
      const result = compare(left, right, rule);
      assert.equal(reconstruct(result, 'left'), preprocess(left, rule));
      assert.equal(reconstruct(result, 'right'), preprocess(right, rule));
      for (const row of result.rows) for (const side of ['left', 'right']) if (row[side]) assert.equal(row[side].segments.map(part => part.text).join(''), row[side].text);
    }
  }
});

test('plain text report includes rule, complete pages, Unicode, HTML and both line numbers', () => {
  const result = compare('  <script>alert(1)</script>\n甲 ', '<script>alert(2)</script>\n乙', 'trim');
  const report = makeReport(result);
  assert.ok(report.includes('空白处理规则：去除每行首尾空白'));
  assert.ok(report.includes('处理后的比对结果'));
  assert.ok(report.includes('- 原始 1 | <script>alert(1)</script>'));
  assert.ok(report.includes('+ 对比 2 | 乙'));
  const many = compare(Array.from({ length: 230 }, (_, i) => `行${i}`).join('\n'), '');
  assert.ok(makeReport(many).includes('- 原始 230 | 行229'));
});

test('catalog, cards, search and breadcrumbs contain the tool', async () => {
  const context = { window: {}, URLSearchParams };
  for (const file of ['assets/navigation.js', 'assets/catalog.js', 'assets/workspace-data.js']) vm.runInNewContext(await readFile(new URL('../' + file, import.meta.url), 'utf8'), context);
  const href = 'tools/text/text-diff.html';
  assert.equal(context.window.PHDSX_TOOLS.filter(tool => tool.href === href).length, 1);
  assert.equal(context.window.PHDSX_SEARCH_INDEX.filter(tool => tool.href === href).length, 1);
  assert.equal(context.window.PHDSXNavigation.resolve(href).parent.href, 'tools.html?category=text');
  assert.ok((await readFile(new URL('../tools.html', import.meta.url), 'utf8')).includes(`data-tool-href="${href}"`));
});

test('vendored modules match pinned upstream checksums', async () => {
  for (const [file, sha256] of [['base.js', 'faa81734df6ea7f8034efc5572ad1bbf19c50b300fdd183baf0d7813c5eec3b2'], ['array.js', '5bcc1320c7ee74e565421a556d81ed3fdd82ff2f366e6151beebac6b425f528f']]) {
    const bytes = await readFile(new URL('../assets/vendor/jsdiff-8.0.3/' + file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
  }
});

test('all new page resources and module imports resolve locally', async () => {
  const root = new URL('../tools/text/', import.meta.url);
  const html = await readFile(new URL('text-diff.html', root), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (match[1].startsWith('#')) continue;
    await access(new URL(match[1].split('?')[0], root));
  }
  for (const file of ['text-diff.mjs', 'text-diff-core.mjs', 'text-diff-worker.mjs']) {
    const source = await readFile(new URL(file, root), 'utf8');
    for (const match of source.matchAll(/(?:from |new URL\()'([^']+)'/g)) await access(new URL(match[1], root));
    assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest)\b/.test(source));
    assert.ok(!/\bconsole\.(?:log|info|debug|error)/.test(source));
    assert.ok(!/\.innerHTML\s*=/.test(source));
  }
});
