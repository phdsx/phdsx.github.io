import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../home/search.js', import.meta.url), 'utf8');

function mount() {
  const node = (dataset = {}) => ({
    dataset, hidden: false, textContent: '', value: '', handlers: {},
    addEventListener(type, handler) { this.handlers[type] = handler; },
    setAttribute(key, value) { this[key] = value; },
    focus() { this.focused = true; }, select() { this.selected = true; }
  });
  const form = node(), input = node(), row = node(), status = node(), empty = node(), clear = node();
  const tool = node({ searchKeywords: 'AI 人工智能 模型 视觉 IQ Codex Reset 预测' });
  tool.textContent = 'AI 雷达';
  const pinyin = node({ searchKeywords: 'EQ Word 注音 调号 pinyin' });
  pinyin.textContent = 'EQ 单字拼音域代码生成器';
  const modes = ['web', 'site'].map((value) => node({ searchMode: value }));
  const engines = ['bing', 'baidu', 'google'].map((value) => node({ searchEngine: value }));
  const events = {};
  const singles = { '.home-search-form': form, '#home-search': input, '.search-engines': row, '[data-search-status]': status, '[data-search-empty]': empty, '[data-search-clear]': clear };
  const groups = { '[data-search-mode]': modes, '[data-search-engine]': engines, '[data-search-tool]': [tool, pinyin], '[data-search-enhanced]': [row] };
  vm.runInNewContext(source, { document: {
    querySelector: (selector) => singles[selector],
    querySelectorAll: (selector) => groups[selector] || [],
    addEventListener: (type, handler) => { events[type] = handler; }
  } });
  return {
    form, input, row, status, empty, tool, pinyin,
    mode: (value) => modes.find((button) => button.dataset.searchMode === value).handlers.click(),
    engine: (value) => engines.find((button) => button.dataset.searchEngine === value).handlers.click(),
    search: (text) => { input.value = text; input.handlers.input(); },
    submit: () => { let prevented = false; form.handlers.submit({ preventDefault() { prevented = true; } }); return prevented; },
    clear: () => clear.handlers.click(),
    shortcut: () => events.keydown({ ctrlKey: true, key: 'k', preventDefault() {} })
  };
}

test('web search selects the provider action and correct query field', () => {
  const app = mount();
  assert.equal(app.form.action, 'https://www.bing.com/search');
  assert.equal(app.input.name, 'q');
  app.engine('baidu');
  assert.equal(app.form.action, 'https://www.baidu.com/s');
  assert.equal(app.input.name, 'wd');
  app.engine('google');
  assert.equal(app.form.action, 'https://www.google.com/search');
  assert.equal(app.input.name, 'q');
  app.search('  AI & 评分  ');
  assert.equal(app.submit(), false, 'Native GET submission handles URL encoding');
  assert.equal(app.input.value, 'AI & 评分');
});

test('local search filters real tools, shows an empty result, and resets', () => {
  const app = mount();
  app.mode('site');
  app.search('ＡＩ Codex');
  assert.equal(app.tool.hidden, false);
  assert.equal(app.pinyin.hidden, true);
  assert.equal(app.row.hidden, true);
  assert.equal(app.submit(), true, 'Local search must not navigate to a web provider');
  assert.equal(app.tool.focused, true);
  app.search('Ｗｏｒｄ 调号');
  assert.equal(app.tool.hidden, true);
  assert.equal(app.pinyin.hidden, false);
  assert.equal(app.status.textContent, '找到 1 个站内工具');
  app.search('no-such-tool');
  assert.equal(app.tool.hidden, true);
  assert.equal(app.empty.hidden, false);
  assert.equal(app.status.textContent, '找到 0 个站内工具');
  app.clear();
  assert.equal(app.tool.hidden, false);
  assert.equal(app.pinyin.hidden, false);
  assert.equal(app.empty.hidden, true);
  assert.equal(app.input.focused, true);
});

test('switching back to web search restores tools and prevents blank submissions', () => {
  const app = mount();
  app.mode('site');
  app.search('absent');
  app.mode('web');
  assert.equal(app.tool.hidden, false);
  assert.equal(app.row.hidden, false);
  app.search('   ');
  assert.equal(app.submit(), true);
  app.shortcut();
  assert.equal(app.input.selected, true);
});
