import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const script = await readFile(new URL('../assets/ai-radar/ai-radar.js', import.meta.url), 'utf8');
const model = { model: 'gpt-test', effort: 'high' };
const payload = (iq) => ({ points: [{ ...model, iq }], source_updated_at: '2026-11-18T08:00:00Z' });
const currentPayload = () => ({
  schema: 'codex-four-task-results/1', protocol: 'codex-four-weighted-150-v2', score_max: 150,
  task_weights: { combined: 60, pompeii: 45, pelican: 22.5, candy: 22.5 },
  rows: [{ ...model, combined: { score: 80 }, pompeii: { score100: 60 }, pelican: { score: 40 }, candy: { correct: true } }]
});

async function mount({ software = payload(140), visual = payload(120), current = currentPayload(), summary = false } = {}) {
  const nodes = new Map();
  const element = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      textContent: '', innerHTML: '', value: '', disabled: false, dataset: {},
      style: { setProperty() {} }, setAttribute() {},
      addEventListener(event, handler) { this[event] = handler; }
    });
    return nodes.get(selector);
  };
  const get = (selector) => summary && /score-list|score-count|score-search/.test(selector) ? null : element(selector);
  const refresh = element('[data-ai-refresh-source="codexradar"]');
  refresh.dataset.aiRefreshSource = 'codexradar';
  const currentRefresh = element('[data-ai-refresh-source="codex-current"]');
  currentRefresh.dataset.aiRefreshSource = 'codex-current';
  const responses = { software, visual, current };
  const fetch = async (url) => {
    let body;
    if (url.includes('intelligence-efficiency.json')) body = responses.software;
    else if (url.includes('radar-legacy-visual.json')) body = responses.visual;
    else if (url.includes('codex-four-task-results.json')) body = responses.current;
    else if (url.includes('willcodexreset.com')) body = { probability24h: 0, probability48h: 20 };
    else body = { probabilities: { rounded_24h: 0, rounded_48h: 30 } };
    if (body instanceof Error) throw body;
    return {
      ok: true,
      json: async () => body,
      text: async () => typeof body === 'string' ? body : `Markdown Content:\n${JSON.stringify(body)}`
    };
  };
  vm.runInNewContext(script, {
    window: {},
    document: { querySelector: get, querySelectorAll: () => [refresh, currentRefresh] },
    fetch, AbortController, URL, setTimeout, clearTimeout,
    console: { warn() {} }
  });
  // The production script starts its initial refresh on mount.
  for (let attempts = 0; element('[data-ai-refresh-all]').disabled; attempts++) {
    assert.ok(attempts < 20, 'Initial refresh should finish');
    await new Promise(setImmediate);
  }
  return {
    text: (selector) => element(selector).textContent,
    html: () => element('[data-ai-score-list]').innerHTML,
    retry: async (updates) => { Object.assign(responses, updates); await refresh.click(); },
    retryCurrent: async (updates) => { Object.assign(responses, updates); await currentRefresh.click(); },
    search: (value) => { const search = element('[data-ai-score-search]'); search.value = value; search.input(); }
  };
}

test('a broken visual archive does not hide available software scores', async () => {
  for (const summary of [false, true]) {
    const app = await mount({ visual: 'Title: 502: Bad gateway\nMarkdown Content:\nBad gateway', summary });
    assert.equal(app.text('[data-ai-best="software"]'), '140.0');
    assert.equal(app.text('[data-ai-best="visual"]'), '--');
    assert.equal(app.text('[data-ai-best="combined"]'), '--');
    assert.match(app.text('[data-ai-source-state="codexradar"]'), /部分可用.*视觉暂缺/);
    assert.match(app.text('[data-ai-refresh-status]'), /部分可用/);
    assert.doesNotMatch(app.text('[data-ai-refresh-status]'), /全部已更新/);
    assert.equal(app.text('[data-ai-source-time="codexradar"]') === '--', false);
    if (!summary) {
      assert.match(app.html(), /GPT-test/);
      assert.doesNotMatch(app.html(), /#1|NaN/);
      app.search('no-match');
      assert.match(app.html(), /没有匹配/);
    }
  }
});

test('software failure leaves visual scores available and retry restores the composite', async () => {
  const app = await mount({ software: new Error('Failed to fetch') });
  assert.equal(app.text('[data-ai-best="software"]'), '--');
  assert.equal(app.text('[data-ai-best="visual"]'), '120.0');
  assert.equal(app.text('[data-ai-best="combined"]'), '--');
  await app.retry({ software: payload(140) });
  assert.equal(app.text('[data-ai-best="combined"]'), '130.0');
  assert.equal(app.text('[data-ai-source-state="codexradar"]'), '归档已读取');
  assert.match(app.html(), /#1/);
  assert.match(app.text('[data-ai-refresh-status]'), /该来源已更新/);
});

test('failed refresh clears previous scores rather than presenting them as current', async () => {
  const app = await mount();
  await app.retry({ visual: new Error('HTTP 502') });
  assert.equal(app.text('[data-ai-best="combined"]'), '--');
  assert.equal(app.text('[data-ai-best="software"]'), '140.0');
  assert.match(app.text('[data-ai-refresh-status]'), /可用评分已更新/);
  await app.retry({ software: new Error('HTTP 503') });
  assert.equal(app.text('[data-ai-best="software"]'), '--');
  assert.equal(app.text('[data-ai-best="visual"]'), '--');
  assert.equal(app.text('[data-ai-source-state="codexradar"]'), '读取失败');
  assert.equal(app.text('[data-ai-source-time="codexradar"]'), '--');
  assert.doesNotMatch(app.html(), /GPT-test/);
});

test('invalid payloads cannot become live, and a genuine zero score is valid', async () => {
  for (const visual of [{}, { points: [] }, payload(null), payload(''), payload(false), payload('NaN')]) {
    const app = await mount({ visual });
    assert.equal(app.text('[data-ai-best="combined"]'), '--');
    assert.match(app.text('[data-ai-source-state="codexradar"]'), /部分可用/);
  }
  const app = await mount({ software: payload(0), visual: payload('120') });
  assert.equal(app.text('[data-ai-best="software"]'), '0.0');
  assert.equal(app.text('[data-ai-best="combined"]'), '60.0');
});

test('models with only one dimension have independent scores but no composite rank', async () => {
  const app = await mount({ software: {
    ...payload(140), points: [...payload(140).points, { model: 'gpt-software-only', effort: 'low', iq: 160 }]
  } });
  assert.equal(app.text('[data-ai-best="software"]'), '160.0');
  assert.equal(app.text('[data-ai-best="combined"]'), '130.0');
  assert.match(app.html(), /GPT-software-only/);
  assert.equal((app.html().match(/#1/g) || []).length, 1);
  assert.doesNotMatch(app.html(), /#2/);
});

test('current four-task scores use source weights, independent of legacy IQ', async () => {
  const app = await mount();
  assert.equal(app.text('[data-ai-current-best]'), '106.50');
  assert.equal(app.text('[data-ai-current-pompeii]'), '60.00');
  assert.equal(app.text('[data-ai-current-count]'), '1');
  assert.equal(app.text('[data-ai-best="combined"]'), '130.0');
  assert.equal(app.text('[data-ai-source-state="codexradar"]'), '归档已读取');
  await app.retryCurrent({ current: { ...currentPayload(), protocol: 'unsupported-v3' } });
  assert.equal(app.text('[data-ai-current-best]'), '--');
  assert.equal(app.text('[data-ai-source-state="codex-current"]'), '读取失败');
  assert.equal(app.text('[data-ai-best="visual"]'), '120.0');
});

test('ungraded current tasks stay absent rather than becoming zero scores', async () => {
  const current = currentPayload();
  current.rows[0].candy.correct = null;
  const app = await mount({ current });
  assert.equal(app.text('[data-ai-current-best]'), '--');
  assert.equal(app.text('[data-ai-source-state="codex-current"]'), '读取失败');
});

test('the homepage links to the standalone radar and does not load its data script', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(home, /href="ai-radar.html"/);
  assert.doesNotMatch(home, /data-ai-|ai-radar\/ai-radar.js|class="home-radar"/);
});
