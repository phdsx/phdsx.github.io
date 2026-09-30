// Run a local static server first. Requires Playwright with installed Chromium.
// Set PLAYWRIGHT_MODULE to a bundled playwright package path when not on NODE_PATH.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEXT_DIFF_URL || 'http://127.0.0.1:8177';
const evidence = new URL('../.local-tools/text-diff-qa/', import.meta.url);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
try {
  const context = await browser.newContext({ viewport: { width: 1487, height: 1058 }, locale: 'zh-CN', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  // Disable existing directory analytics during local verification.
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(base + '/tools.html?category=text&lang=zh', { waitUntil: 'networkidle' });
  await page.locator('#directory-search').fill('文本差异');
  check(await page.locator('[data-tool-href="tools/text/text-diff.html"]').isVisible(), 'tool card is searchable in the text category');
  check((await page.locator('[data-directory-status]').textContent()).includes('1'), 'one result, without duplicate cards');
  await page.locator('[data-tool-href="tools/text/text-diff.html"] a').click();
  await page.waitForURL('**/tools/text/text-diff.html**');
  await page.waitForLoadState('networkidle');
  const errors = [], outgoing = [], storage = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith(base)) outgoing.push(request.url()); });
  await page.evaluate(() => {
    window.__textDiffStorageWrites = [];
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { window.__textDiffStorageWrites.push([key, value]); return save.call(this, key, value); };
  });
  check((await page.locator('.ubuntu-breadcrumbs').textContent()).includes('文本差异比对'), 'breadcrumbs include tool name');
  check(await page.locator('.ubuntu-parent').getAttribute('href') === base + '/tools.html?category=text', 'back-to-category link resolves');
  const original = page.locator('#original'), comparison = page.locator('#comparison');
  async function fillInput(id, text) {
    if (text.length < 20000) return page.locator('#' + id).fill(text);
    // Avoid timing Playwright's synthetic paste machinery as diff computation.
    // Dispatch the real input event so the application's stale-state path runs.
    await page.evaluate(({ id, text }) => { const input = document.getElementById(id); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); }, { id, text });
  }
  async function compare(a, b, rule = 'none') {
    await fillInput('original', a); await fillInput('comparison', b); await page.locator('#whitespace').selectOption(rule);
    const started = Date.now();
    await page.locator('#compare').click();
    await page.waitForFunction(() => document.getElementById('result').getAttribute('aria-busy') === 'false');
    check(await page.locator('#status').getAttribute('data-error') !== 'true', 'comparison finishes without error');
    return Date.now() - started;
  }
  const summary = () => page.locator('#summary').textContent();
  const clipboardText = () => page.evaluate(() => Promise.race([
    navigator.clipboard.readText(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard read timed out')), 5000))
  ]));
  await compare('中文 English 123，👩🏽‍💻！', '中文 English 123，👩🏽‍💻！');
  check(await summary() === '文本一致', 'identical text status');
  await compare('甲乙丙丁', '甲乙新丙丁');
  check(await page.locator('.diff-token.add').textContent() === '新', 'only inserted character highlighted');
  check(await page.locator('.diff-token.delete').count() === 0, 'common suffix is not deleted');
  await compare('甲乙新丙丁', '甲乙丙丁');
  check(await page.locator('.diff-token.delete').textContent() === '新', 'only deleted character highlighted');
  await compare('标题\n旧行\n结尾', '标题\n新行\n新增一\n新增二\n结尾');
  check((await summary()).includes('新增 2 行') && (await summary()).includes('修改 1 行'), 'modified plus consecutive added lines');
  check((await page.locator('.diff-row').last().textContent()).includes('相同'), 'ending stays aligned');
  await compare('头\n重复\n重复\n尾', '头\n重复\n插入\n重复\n尾');
  check((await summary()).includes('新增 1 行'), 'duplicate line alignment');
  await compare('', '一\n二'); check((await summary()).includes('新增 2 行'), 'empty original');
  await compare('一\n二', ''); check((await summary()).includes('删除 2 行'), 'empty comparison');
  await compare('', ''); check(await summary() === '文本一致', 'both empty');
  await compare(' \t\u3000\n', ''); check((await summary()).includes('差异块'), 'whitespace-only default differs');
  await compare('A\r\nB\r\n', 'A\nB\n'); check(await summary() === '文本一致', 'CRLF/LF equivalent');
  await compare(' 前 👩🏽‍💻 后 ', '前👨‍💻后', 'spaces');
  check(await page.locator('.diff-token.delete').textContent() === '👩🏽‍💻', 'grapheme is not split');
  check(await original.inputValue() === ' 前 👩🏽‍💻 后 ', 'preprocessing leaves original input unchanged');
  check((await page.locator('#result-rule').textContent()).includes('处理后的比对结果'), 'processed result is explicitly labeled');
  for (const [a, b, rule] of [['a b', 'ab', 'spaces'], [' \t甲 乙\t\u3000\n 丙 ', '甲 乙\n丙', 'trim'], [' a\u3000\t\u00a0\u0085\n b ', 'ab', 'all']]) {
    await compare(a, b, rule);
    check(await summary() === '按当前空白处理规则，两段文本一致', `whitespace equivalence ${rule}`);
    check(await original.inputValue() === a, `raw input intact ${rule}`);
  }
  const malicious = '<script>window.__diffInjected=1</script>\n<img src=x onerror="window.__diffInjected=2">';
  await compare(malicious, malicious.replace('=1', '=3'));
  check(await page.evaluate(() => window.__diffInjected === undefined), 'script and HTML are inert');
  check(await page.locator('#diff-output script, #diff-output img').count() === 0, 'user HTML is not parsed');
  check((await page.locator('#diff-output').textContent()).includes('<script>'), 'HTML is visible as text');
  await compare('首页', '首页');
  await page.locator('[data-i18n-toggle]').first().click();
  check(await page.locator('.diff-text').first().textContent() === '首页', 'language toggle cannot rewrite user text');
  await page.locator('[data-i18n-toggle]').first().click();
  await original.fill('changed');
  check((await summary()).includes('等待重新比对'), 'editing invalidates results');
  check(await page.locator('#download').isDisabled(), 'stale result cannot be downloaded');
  check(await page.locator('.diff-row').count() === 0, 'old diff removed immediately');
  await compare('a b', 'ab');
  await page.locator('#whitespace').selectOption('spaces');
  check(await page.locator('#download').isDisabled(), 'option change invalidates result');
  await page.locator('#swap').click();
  check(await original.inputValue() === 'ab' && await comparison.inputValue() === 'a b', 'swap preserves the original text');
  await page.locator('#compare').click(); await page.waitForFunction(() => !document.getElementById('compare').disabled);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloadPromise;
  const report = await readFile(await download.path(), 'utf8');
  check(report.includes('空白处理规则：去除普通空格') && report.includes('处理后的比对结果'), 'download includes whitespace rule');
  check((await page.locator('#status').textContent()).includes('下载'), 'download feedback');
  await page.locator('#copy-original').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('已复制'));
  check((await page.locator('#status').textContent()).includes('已复制'), 'copy feedback');
  check(await clipboardText() === 'ab', 'original clipboard content');
  await page.locator('#copy-comparison').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('已复制对比文本'));
  check(await clipboardText() === 'a b', 'comparison clipboard content');
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  await page.locator('#copy-original').click();
  await page.waitForFunction(() => document.getElementById('status').dataset.error === 'true');
  check((await page.locator('#status').textContent()).includes('已选中'), 'clipboard failure has manual fallback');
  const many = Array.from({ length: 4500 }, (_, i) => `${i} 中文 English 重复内容`).join('\n');
  const largeElapsedMs = await compare(many, many.replace('100 中文', '100 新中文').replace('2250 中文', '2250 改中文').replace('4490 中文', '4490 末中文'));
  check((await summary()).includes('3 个差异块'), 'large input contains 3 blocks');
  check(await page.locator('.diff-row').count() <= 100, 'large results are paginated');
  await page.locator('#next-diff').click();
  check(await page.locator('#diff-position').textContent() === '2 / 3 处', 'next difference crosses pages');
  check((await page.locator('#page-position').textContent()).includes('23 / 45'), 'navigation selects page with block');
  check(await page.evaluate(() => { const row = document.querySelector('.diff-row.current').getBoundingClientRect(), region = document.getElementById('diff-output').getBoundingClientRect(); return row.top >= region.top - 3 && row.top < region.bottom; }), 'navigated block is visible in scroll region');
  await page.locator('#previous-diff').click(); check(await page.locator('#diff-position').textContent() === '1 / 3 处', 'previous difference');
  await page.locator('#previous-diff').click(); check(await page.locator('#diff-position').textContent() === '3 / 3 处', 'navigation wraps');
  await page.locator('#previous-page').click(); check((await page.locator('#page-position').textContent()).includes('44 / 45'), 'previous page');
  const allReportPromise = page.waitForEvent('download'); await page.locator('#download').click();
  const allReport = await allReportPromise;
  check((await readFile(await allReport.path(), 'utf8')).includes('原始 4500 / 对比 4500'), 'report includes rows outside current page');
  await fillInput('original', 'x'.repeat(200001)); await page.locator('#compare').click();
  check((await page.locator('#status').textContent()).includes('200,000') && (await page.locator('#status').textContent()).includes('未进行截断'), 'over-limit error is explicit');
  check(await original.inputValue() === 'x'.repeat(200001), 'over-limit text is never silently truncated');
  await original.fill('\n'.repeat(5000)); await page.locator('#compare').click();
  check((await page.locator('#status').textContent()).includes('5,000'), 'line limit');
  await fillInput('original', 'a'.repeat(20001)); await page.locator('#compare').click();
  check((await page.locator('#status').textContent()).includes('单行'), 'line-length limit');
  const hardA = Array.from({ length: 3500 }, (_, i) => `原始${i}`).join('\n'), hardB = Array.from({ length: 3500 }, (_, i) => `新版${i}`).join('\n');
  await fillInput('original', hardA); await fillInput('comparison', hardB); await page.locator('#compare').click();
  check(await page.locator('#result').getAttribute('aria-busy') === 'true', 'costly comparison runs in a worker');
  // The UI must still be operable while a potentially costly worker is running.
  await page.locator('#swap').click();
  check(await page.locator('#compare').isEnabled(), 'swap cancels worker without blocking the UI');
  check(await page.locator('#download').isDisabled(), 'canceled worker cannot publish old results');
  await page.locator('#sample').click(); await page.locator('#compare').click(); await page.waitForFunction(() => !document.getElementById('compare').disabled);
  check((await summary()).includes('删除 1 行') && (await summary()).includes('新增 2 行'), 'sample includes additions and deletions');
  await page.locator('#show-whitespace').uncheck();
  check((await page.locator('.diff-text').allTextContents()).some(text => text.includes('  空格')), 'whitespace visualization can be disabled');
  await page.locator('#show-whitespace').check();
  check((await page.locator('#diff-output').textContent()).includes('⇥'), 'whitespace characters are visible');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(evidence.pathname.replace(/^\/(\w:)/, '$1'), 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile has no horizontal page overflow');
  check(await page.locator('.diff-row').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length === 1), 'mobile uses stacked pairs');
  check(await page.locator('.diff-inputs').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length === 1), 'mobile inputs stack');
  await page.screenshot({ path: join(evidence.pathname.replace(/^\/(\w:)/, '$1'), 'mobile.png'), fullPage: true });
  // Long-line wrapping on a phone, including a large changed character span.
  await compare('中文'.repeat(500), '中文'.repeat(499) + '修改');
  check(await page.evaluate(() => { const region = document.getElementById('diff-output'); return region.scrollWidth <= region.clientWidth + 1; }), 'long lines wrap inside mobile output');
  await page.locator('#clear-original').click(); check(await original.inputValue() === '', 'individual original clear');
  await page.locator('#clear-comparison').click(); check(await comparison.inputValue() === '', 'individual comparison clear');
  await page.locator('#sample').click(); await page.locator('#clear-all').click();
  check(await original.inputValue() === '' && await comparison.inputValue() === '', 'clear all');
  check((await page.locator('#status').textContent()).includes('已清空'), 'clear feedback');
  // Keyboard focus and action activation.
  await page.locator('#compare').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('compare').disabled);
  check(await summary() === '文本一致', 'keyboard can start comparison');
  check(await page.locator('#original').evaluate(node => node.labels.length === 1), 'original has accessible label');
  check(await page.locator('#comparison').evaluate(node => node.labels.length === 1), 'comparison has accessible label');
  storage.push(...await page.evaluate(() => window.__textDiffStorageWrites));
  check(storage.every(([key]) => key === 'phdsx-language'), 'input text is never persisted');
  check(outgoing.length === 0, 'no outgoing requests from the tool');
  check(errors.length === 0, `no tool console errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ checks, largeInputUnits: many.length, largeElapsedMs, consoleErrors: errors, outgoingRequests: outgoing.length, screenshots: evidence.pathname }, null, 2));
  await context.close();
} finally { await browser.close(); }
