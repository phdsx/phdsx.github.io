import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../home/portal.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const sections = [...html.matchAll(/<a class="portal-card"[^>]*href="([^"]+)"[^>]*data-home-section="([^"]+)"[^>]*data-keywords="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map(([, href, category, keywords, body]) => ({ href, category, keywords, text: body.replace(/<[^>]+>/g, ' ') }));

function mount(items = sections) {
  const element = () => ({
    hidden: true, value: '', textContent: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    focus() { this.focused = true; }, select() { this.selected = true; },
    setAttribute(key, value) { this[key] = value; }
  });
  const input = element(), form = element(), result = element(), empty = element();
  input.closest = () => form;
  const reset = [element(), element()];
  const controls = [element(), element()];
  const filters = ['all', 'tools', 'play', 'reading', 'topics'].map((category) => {
    const button = element(), count = element();
    button.dataset = { homeFilter: category };
    button.count = count;
    button.querySelector = () => count;
    return button;
  });
  const cards = items.map((item) => Object.assign(element(), { textContent: item.text, href: item.href, dataset: { homeSection: item.category, keywords: item.keywords } }));
  const events = {};
  const groups = { '[data-home-section]': cards, '[data-home-filter]': filters, '[data-home-reset]': reset, '[data-home-controls]': controls };
  vm.runInNewContext(source, { document: {
    querySelectorAll: (selector) => groups[selector] || [],
    querySelector: (selector) => ({ '#section-search': input, '[data-home-results]': result, '[data-home-empty]': empty })[selector],
    addEventListener: (type, fn) => { events[type] = fn; }
  } });
  return {
    cards, filters, controls, result, empty, input,
    visible: () => cards.filter((card) => !card.hidden).map((card) => card.href),
    filter: (category) => filters.find((button) => button.dataset.homeFilter === category).handlers.click(),
    search: (text) => { input.value = text; input.handlers.input(); },
    reset: () => reset[0].handlers.click(),
    enter: () => form.handlers.submit({ preventDefault() {} }),
    escape: () => input.handlers.keydown({ key: 'Escape', preventDefault() {} }),
    shortcut: () => events.keydown({ ctrlKey: true, key: 'k', preventDefault() {} })
  };
}

test('all existing section links are available before enhancement', () => {
  assert.equal(sections.length, 9);
  assert.equal(new Set(sections.map((section) => section.href)).size, 9);
  assert.ok(sections.some((section) => section.href === 'ai-radar.html'));
  assert.doesNotMatch(html, /class="portal-card"[^>]*\bhidden/);
});

test('categories combine with search and reset restores the whole directory', () => {
  const app = mount();
  assert.equal(app.visible().length, 9);
  assert.ok(app.controls.every((control) => !control.hidden));
  app.filter('reading');
  assert.deepEqual(app.visible(), ['blog.html', 'novels/index.html']);
  app.search('小说');
  assert.deepEqual(app.visible(), ['novels/index.html']);
  assert.match(app.result.textContent, /找到 1 个栏目/);
  app.search('absent-column');
  assert.equal(app.empty.hidden, false);
  assert.equal(app.visible().length, 0);
  app.reset();
  assert.equal(app.visible().length, 9);
  assert.equal(app.empty.hidden, true);
  assert.equal(app.filters[0]['aria-pressed'], 'true');
});

test('full-width input, aliases and keyboard controls work', () => {
  const app = mount();
  app.search('ＣＯＤＥＸ');
  assert.deepEqual(app.visible(), ['ai-radar.html']);
  app.enter();
  assert.equal(app.cards.find((card) => card.href === 'ai-radar.html').focused, true);
  app.shortcut();
  assert.equal(app.input.selected, true);
  app.escape();
  assert.equal(app.visible().length, 9);
  app.search('二维码');
  assert.deepEqual(app.visible(), ['tools.html']);
});

test('a 60-section directory derives its counts and filtering from the cards', () => {
  const categories = ['tools', 'play', 'reading', 'topics'];
  const items = Array.from({ length: 60 }, (_, i) => ({ href: `section-${i}.html`, category: categories[i % 4], text: `新增栏目 ${i}`, keywords: `topic-${i}` }));
  const app = mount(items);
  assert.equal(app.visible().length, 60);
  assert.equal(app.filters[0].count.textContent, '60');
  app.filter('topics');
  assert.equal(app.visible().length, 15);
  app.search('topic-59');
  assert.deepEqual(app.visible(), ['section-59.html']);
  assert.match(app.result.textContent, /共 60 个/);
});
