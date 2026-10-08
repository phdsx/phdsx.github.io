/* Run with the project's local HTTP preview and Playwright on NODE_PATH.
 * JSON fixtures, uploads, clipboard and downloads stay in this local test browser. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.JSON_TEST_URL || 'http://127.0.0.1:8177';
    const url = base + '/tools/text/json-formatter.html';
    const evidence = path.resolve(__dirname, '../../docs/audit/evidence/json-formatter');
    await fs.mkdir(evidence, { recursive: true });
    await page.goto(url);
    const input = page.locator('#json-input');
    async function settled() {
      await page.waitForFunction(() => document.querySelector('.json-result-panel').getAttribute('aria-busy') === 'false');
    }
    async function format(source, action = 'format') {
      await input.fill(source); await page.locator('#' + action).click(); await settled();
    }
    async function copied() {
      await page.locator('#copy').click();
      await page.waitForFunction(() => document.getElementById('status').textContent === '已复制完整结果。');
      return page.evaluate(() => navigator.clipboard.readText());
    }
    await page.locator('#format').click();
    assert.match(await page.locator('#json-error').innerText(), /请先粘贴/);
    await page.locator('#sample').click(); await settled();
    assert.match(await copied(), /900719925474099312345/);
    await page.locator('#indent').selectOption('4'); await settled();
    assert.match(await copied(), /\n {4}"名称"/);
    await page.locator('#tree-view').click();
    assert.match(await page.locator('#tree-result').innerText(), /Array \[2 个元素\]/);
    await page.locator('#expand').click();
    assert.equal(await page.locator('.json-tree-row').count(), 19);
    await page.locator('#collapse').click();
    assert.equal(await page.locator('.json-tree-row').count(), 1);
    await page.locator('.json-tree-toggle').click();
    assert.ok(await page.locator('.json-tree-row').count() > 1);
    await page.locator('#code-view').click();
    await page.screenshot({ path: path.join(evidence, 'desktop.png'), fullPage: true });
    const layout = await page.locator('.json-workspace').evaluate(element => getComputedStyle(element).gridTemplateColumns);
    assert.equal(layout.split(' ').length, 2);
    console.log('PASS desktop layout, sample, indent, tree expansion and clipboard');

    const invalid = '{\n  "中文": [1,]\n}';
    await format(invalid);
    assert.match(await page.locator('#json-error').innerText(), /第 2 行，第 12 列/);
    assert.equal(await input.inputValue(), invalid);
    assert.ok(await page.locator('#copy').isDisabled());
    await page.locator('#locate').click();
    assert.equal(await input.evaluate(element => element.selectionStart), invalid.indexOf(']'));
    for (const source of ['{}', '[]', 'null', 'true', '"中文😀"']) {
      await format(source);
      assert.equal(await copied(), source);
    }
    const lossless = '{"id":900719925474099312345,"decimal":1.234567890123456789,"e":1E+999,"a":1,"a":2,"html":"<img src=x onerror=alert(1)>"}';
    await format(lossless, 'compress');
    assert.equal(await copied(), lossless);
    assert.equal(await page.locator('#code-result img').count(), 0);
    assert.equal(await input.inputValue(), lossless);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await downloadEvent;
    const stream = await download.createReadStream(); const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString('utf8'), lossless);
    await input.fill('{"modified":true}');
    assert.ok(await page.locator('#download').isDisabled());
    assert.equal(await page.locator('#code-result').textContent(), '');
    console.log('PASS errors, location, original input, primitives, lossless numbers, safe rendering, compression and download');

    await page.locator('#json-file').setInputFiles({ name: '中文.json', mimeType: 'application/json', buffer: Buffer.from('{"上传":"中文","items":[1,2]}') });
    await page.waitForFunction(() => document.getElementById('summary').textContent.includes('已校验'));
    assert.match(await copied(), /"上传": "中文"/);
    await page.locator('#json-file').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('{}') });
    assert.match(await page.locator('#status').innerText(), /无效文件/);
    await page.locator('#json-file').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.alloc(0) });
    assert.match(await page.locator('#status').innerText(), /文件为空/);
    await page.locator('#json-file').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    assert.match(await page.locator('#status').innerText(), /超过 2 MiB/);
    await page.evaluate(() => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['{"drop":[{},[]]}'], 'drop.json', { type: 'application/json' }));
      document.getElementById('drop-zone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
    await page.waitForFunction(() => document.getElementById('json-input').value.includes('drop') && !document.getElementById('copy').disabled);
    assert.match(await copied(), /"drop"/);
    await page.evaluate(() => {
      const transfer = new DataTransfer(); const file = new File(['{}'], 'unreadable.json');
      file.arrayBuffer = () => Promise.reject(new Error('simulated read failure'));
      transfer.items.add(file);
      // DataTransfer may rewrap files, so inject the error on the returned file.
      transfer.files[0].arrayBuffer = file.arrayBuffer;
      document.getElementById('drop-zone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('文件读取失败'));
    assert.match(await input.inputValue(), /drop/);
    console.log('PASS file upload, drag/drop, extension, empty/oversized files and read failure');

    await format('['.repeat(130) + '0' + ']'.repeat(130));
    assert.match(await page.locator('#json-error').innerText(), /128/);
    await format('[' + Array(10000).fill('{"n":9007199254740993}').join(',') + ']');
    assert.ok(await page.locator('.json-code-line').count() <= 200);
    assert.match(await page.locator('#page-info').innerText(), /\/ 151 页/);
    await page.locator('#next').click();
    assert.equal(await page.locator('.json-line-number').first().innerText(), '201');
    await page.locator('#tree-view').click(); await page.locator('#expand').click();
    assert.equal(await page.locator('.json-tree-row').count(), 200);
    await page.locator('#clear').click();
    assert.equal(await input.inputValue(), '');
    assert.ok(await page.locator('#copy').isDisabled());
    console.log('PASS depth protection, large-array pagination, bounded tree DOM and clear');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#sample').click(); await settled();
    await page.locator('#code-view').click();
    assert.equal(await page.locator('.json-workspace').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: path.join(evidence, 'mobile.png'), fullPage: true });
    await page.goto(base + '/tools.html?category=text&q=JSON');
    const entry = page.locator('.workspace-card-link[href="tools/text/json-formatter.html"]');
    await entry.waitFor({ state: 'visible' });
    await entry.click();
    assert.equal(new URL(page.url()).pathname, '/tools/text/json-formatter.html');
    assert.equal(await page.locator('.ubuntu-breadcrumbs').count() > 0, true);
    assert.deepEqual(errors, []);
    console.log('PASS mobile layout, no horizontal overflow, directory filtering, entry route and no JavaScript exceptions');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
