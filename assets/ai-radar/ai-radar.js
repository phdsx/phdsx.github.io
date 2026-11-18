(function () {
  const SOFTWARE_URL = 'https://codexradar.com/data/intelligence-efficiency.json';
  const VISUAL_URL = 'https://codexradar.com/data/radar-legacy-visual.json';
  const CURRENT_URL = 'https://codexradar.com/data/codex-four-task-results.json';
  const CODEX_FORECAST_URL = 'https://codex-reset.com/api/forecast';
  const CODEX_FEED_URL = 'https://codex-reset.com/api/feed';
  const WILL_RESET_URL = 'https://willcodexreset.com/api/reset-radar';
  const JINA_BASE = 'https://r.jina.ai/';
  const state = { scoreRows: [], currentRows: [], scoreAvailability: null, forecast: null, willPayload: null, codexFeed: null };

  function radarText(key, fallback, variables) {
    if (window.PHDSXI18n) return window.PHDSXI18n.t(key, fallback, variables);
    return variables ? fallback.replace(/\{(\w+)\}/g, (token, name) => variables[name] ?? token) : fallback;
  }

  function get(selector, root) {
    return (root || document).querySelector(selector);
  }

  function getAll(selector, root) {
    return [...(root || document).querySelectorAll(selector)];
  }

  function setText(selector, text) {
    const element = get(selector);
    if (element) element.textContent = text;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function safeUrl(value, base) {
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function formatDateTime(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const locale = window.PHDSXI18n ? window.PHDSXI18n.getLocale() : 'zh-CN';
    return date.toLocaleString(locale, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatScore(value) {
    if (value == null) return '--';
    const score = Number(value);
    return Number.isFinite(score) ? score.toFixed(1) : '--';
  }

  function formatModel(model) {
    const labels = {
      'gpt-5.6-sol': 'GPT-5.6 Sol',
      'gpt-5.6-terra': 'GPT-5.6 Terra',
      'gpt-5.6-luna': 'GPT-5.6 Luna',
      'gpt-5.5': 'GPT-5.5',
      'gpt-5.4': 'GPT-5.4',
      'gpt-5.4-mini': 'GPT-5.4 mini'
    };
    return labels[model] || String(model || '未知模型').replace(/^gpt-/i, 'GPT-')
      .replace(/^(GPT-\d+(?:\.\d+)*)-(sol|terra|astra|luna)\b/i, (_, version, family) => `${version} ${family[0].toUpperCase()}${family.slice(1).toLowerCase()}`);
  }

  function sourceState(source, status, message) {
    const element = get(`[data-ai-source-state="${source}"]`);
    if (!element) return;
    element.className = `ai-source-state is-${status}`;
    element.textContent = message;
  }

  function setSourceBusy(source, busy) {
    const button = get(`[data-ai-refresh-source="${source}"]`);
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, { cache: 'no-store', ...(options || {}), signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchJson(url) {
    return (await fetchWithTimeout(url)).json();
  }

  async function fetchJinaJson(sourceUrl) {
    const minuteKey = Math.floor(Date.now() / 60000);
    const separator = sourceUrl.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${JINA_BASE}${sourceUrl}${separator}_=${minuteKey}`);
    const text = await response.text();
    const marker = text.indexOf('Markdown Content:');
    const start = text.indexOf('{', marker >= 0 ? marker : 0);
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('未找到 JSON 数据');
    return JSON.parse(text.slice(start, end + 1));
  }

  function renderBest(kind, row, score) {
    const value = get(`[data-ai-best="${kind}"]`);
    const label = get(`[data-ai-best-label="${kind}"]`);
    if (!value || !label) return;
    value.textContent = row ? formatScore(score) : '--';
    label.textContent = row ? `${formatModel(row.model)} · ${row.effort}` : radarText('radar.noData', '暂无可用数据');
  }

  function renderScoreRows() {
    const list = get('[data-ai-score-list]');
    const count = get('[data-ai-score-count]');
    if (!list || !count) return;
    const query = String(get('[data-ai-score-search]')?.value || '').trim().toLowerCase();
    const rows = state.scoreRows.filter((row) => `${formatModel(row.model)} ${row.model} ${row.effort}`.toLowerCase().includes(query));
    if (!rows.length) {
      list.innerHTML = `<tr><td colspan="5" class="ai-loading-cell">${state.scoreRows.length ? radarText('radar.noMatchingModels', '没有匹配的模型档位。') : radarText('radar.noMergedScores', '暂时没有可合并的评分数据。')}</td></tr>`;
    } else {
      list.innerHTML = rows.map((row) => `
        <tr>
          <td class="ai-score-rank">${row.rank ? `#${row.rank}` : '--'}</td>
          <td><span class="ai-model-name">${escapeHtml(formatModel(row.model))}</span><span class="ai-model-effort">${escapeHtml(row.effort)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.combined ?? 0}">${formatScore(row.combined)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.software ?? 0}">${formatScore(row.software)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.visual ?? 0}">${formatScore(row.visual)}</span></td>
        </tr>`).join('');
    }
    count.textContent = radarText('radar.availableTiers', '显示 {shown} / {total} 个档位，缺失维度显示 --', { shown: rows.length, total: state.scoreRows.length });
  }

  function renderScoreSummary() {
    for (const kind of ['combined', 'software', 'visual']) {
      const best = state.scoreRows.filter((row) => row[kind] !== null).sort((a, b) => b[kind] - a[kind])[0];
      renderBest(kind, best, best?.[kind]);
    }
    renderScoreRows();
    if (!state.scoreAvailability) return;
    const { software, visual } = state.scoreAvailability;
    const complete = software && visual;
    sourceState('codexradar', complete ? 'archive' : software || visual ? 'partial' : 'error', complete
      ? radarText('radar.archiveLoaded', '归档已读取')
      : software ? radarText('radar.visualUnavailable', '部分可用 · 视觉暂缺')
      : visual ? radarText('radar.softwareUnavailable', '部分可用 · 软件工程暂缺')
      : radarText('radar.failed', '读取失败'));
  }

  async function fetchScorePoints(loader) {
    const payload = await loader();
    const points = Array.isArray(payload?.points) ? payload.points.filter((point) => (
      point && typeof point.model === 'string' && typeof point.effort === 'string' &&
      (typeof point.iq === 'number' || typeof point.iq === 'string' && point.iq.trim() !== '') && Number.isFinite(Number(point.iq))
    )) : [];
    if (!points.length) throw new Error('评分数据为空或格式不正确');
    return { ...payload, points };
  }

  async function loadScores() {
    sourceState('codexradar', 'loading', radarText('radar.reading', '正在读取'));
    const stamp = Date.now();
    const results = await Promise.allSettled([
      fetchScorePoints(() => fetchJson(`${SOFTWARE_URL}?v=${stamp}`)),
      fetchScorePoints(() => fetchJson(VISUAL_URL))
    ]);
    const [softwarePayload, visualPayload] = results.map((result) => result.status === 'fulfilled' ? result.value : null);
    state.scoreAvailability = { software: Boolean(softwarePayload), visual: Boolean(visualPayload) };
    const rows = new Map();
    for (const [kind, payload] of [['software', softwarePayload], ['visual', visualPayload]]) {
      for (const point of payload?.points || []) {
        const key = `${point.model}|${point.effort}`;
        const row = rows.get(key) || { model: point.model, effort: point.effort, software: null, visual: null, combined: null };
        row[kind] = Number(point.iq);
        rows.set(key, row);
      }
    }
    state.scoreRows = [...rows.values()].map((row) => ({
      ...row,
      combined: row.software !== null && row.visual !== null ? (row.software + row.visual) / 2 : null
    })).sort((a, b) => (b.combined ?? -Infinity) - (a.combined ?? -Infinity) || (b.software ?? b.visual) - (a.software ?? a.visual))
      .map((row, index) => ({ ...row, rank: row.combined === null ? null : index + 1 }));
    renderScoreSummary();
    setText('[data-ai-software-time]', formatDateTime(softwarePayload?.source_updated_at));
    setText('[data-ai-visual-time]', formatDateTime(visualPayload?.source_updated_at));
    const sourceTime = [softwarePayload?.source_updated_at, visualPayload?.source_updated_at].filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0];
    get('[data-ai-source-time="codexradar"]').textContent = formatDateTime(sourceTime);
    for (const result of results) {
      if (result.status === 'rejected') console.warn('CodexRadar dimension unavailable:', result.reason);
    }
    if (!softwarePayload && !visualPayload) throw new Error('两个评分维度均不可用');
    return softwarePayload && visualPayload ? true : 'partial';
  }

  function renderCurrentRows() {
    const list = get('[data-ai-current-list]');
    if (!list) return;
    const query = String(get('[data-ai-current-search]')?.value || '').trim().toLowerCase();
    const rows = state.currentRows.filter((row) => `${formatModel(row.model)} ${row.effort}`.toLowerCase().includes(query));
    list.innerHTML = rows.length ? rows.map((row) => `<tr>
      <td class="ai-score-rank">#${row.rank}</td>
      <td><span class="ai-model-name">${escapeHtml(formatModel(row.model))}</span><span class="ai-model-effort">${escapeHtml(row.effort)}</span></td>
      ${[row.total, ...row.parts].map((value) => `<td><span class="ai-score-value">${value.toFixed(2)}</span></td>`).join('')}
    </tr>`).join('') : `<tr><td colspan="7" class="ai-loading-cell">${state.currentRows.length ? '没有匹配的模型档位。' : '当前四题评分暂不可用，请稍后重试。'}</td></tr>`;
    setText('[data-ai-current-filter-count]', `显示 ${rows.length} / ${state.currentRows.length} 个档位`);
  }

  function clearCurrentScores() {
    state.currentRows = [];
    for (const selector of ['best', 'pompeii', 'count']) setText(`[data-ai-current-${selector}]`, '--');
    for (const selector of ['best-label', 'pompeii-label', 'round', 'interval']) setText(`[data-ai-current-${selector}]`, '暂无可用数据');
    setText('[data-ai-source-time="codex-current"]', '--');
    renderCurrentRows();
  }

  async function loadCurrentScores() {
    sourceState('codex-current', 'loading', '正在读取');
    const payload = await fetchJson(CURRENT_URL);
    const tasks = ['combined', 'pompeii', 'pelican', 'candy'];
    const weights = [60, 45, 22.5, 22.5];
    if (payload?.schema !== 'codex-four-task-results/1' || payload.protocol !== 'codex-four-weighted-150-v2' ||
      payload.score_max !== 150 || !tasks.every((key, i) => payload.task_weights?.[key] === weights[i]) || !Array.isArray(payload.rows)) {
      throw new Error('当前评分协议已变化，请核对来源');
    }
    const valid = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
    state.currentRows = payload.rows.flatMap((row) => {
      if (!row || typeof row.model !== 'string' || typeof row.effort !== 'string' ||
        !valid(row.combined?.score) || !valid(row.pompeii?.score100) || !valid(row.pelican?.score) || typeof row.candy?.correct !== 'boolean') return [];
      const parts = [row.combined.score, row.pompeii.score100, row.pelican.score, row.candy.correct ? 100 : 0].map((score, i) => score / 100 * weights[i]);
      return [{ model: row.model, effort: row.effort, parts, total: parts.reduce((a, b) => a + b, 0), pompeii: row.pompeii.score100 }];
    }).sort((a, b) => b.total - a.total).map((row, i) => ({ ...row, rank: i + 1 }));
    if (!state.currentRows.length) throw new Error('当前轮次没有有效评分');
    const best = state.currentRows[0];
    const spatial = [...state.currentRows].sort((a, b) => b.pompeii - a.pompeii)[0];
    setText('[data-ai-current-best]', best.total.toFixed(2));
    setText('[data-ai-current-best-label]', `${formatModel(best.model)} · ${best.effort}`);
    setText('[data-ai-current-pompeii]', spatial.pompeii.toFixed(2));
    setText('[data-ai-current-pompeii-label]', `${formatModel(spatial.model)} · ${spatial.effort}`);
    setText('[data-ai-current-count]', String(state.currentRows.length));
    setText('[data-ai-current-round]', payload.round_id || '--');
    setText('[data-ai-current-interval]', payload.author_test_interval?.display_zh || '测试时间未提供');
    setText('[data-ai-source-time="codex-current"]', formatDateTime(payload.score_snapshot_at || payload.verified_at));
    renderCurrentRows();
    sourceState('codex-current', 'live', '本轮已读取');
  }

  function probability(value) {
    const numeric = value == null || value === '' ? NaN : Number(value);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100 ? numeric : null;
  }

  function setProbability(key, value) {
    const numeric = probability(value);
    const card = get(`[data-ai-probability-card="${key}"]`);
    if (card) card.style.setProperty('--probability', numeric ?? 0);
    setText(`[data-ai-probability="${key}"]`, numeric === null ? '--' : `${numeric}%`);
  }

  function renderCodexEvidence(items) {
    const list = get('[data-ai-codex-evidence]');
    if (!list) return;
    const evidence = Array.isArray(items) ? items.slice(0, 4) : [];
    if (!evidence.length) {
      list.innerHTML = `<li class="ai-feed-empty">${radarText('radar.noEvidence', '当前没有公开预测依据。')}</li>`;
      return;
    }
    list.innerHTML = evidence.map((item) => {
      const href = safeUrl(item.href, 'https://codex-reset.com');
      const body = `<strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span>`;
      return href ? `<li><a class="ai-evidence-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${body}</a></li>` : `<li><div class="ai-evidence-link">${body}</div></li>`;
    }).join('');
  }

  function renderCodexFeed(payload) {
    const root = get('[data-ai-codex-feed]');
    if (!root) return;
    const tweets = (Array.isArray(payload.tweets) ? payload.tweets : []).filter((item) => item.tibo_lane === 'reset_related' || item.explicit_reset_claim || item.kind === 'candidate').slice(0, 4);
    if (!tweets.length) {
      root.innerHTML = `<p class="ai-feed-empty">${radarText('radar.noRadarFeed', '当前没有可展示的雷达动态。')}</p>`;
      return;
    }
    root.innerHTML = tweets.map((item) => {
      const url = safeUrl(item.url, 'https://x.com');
      const text = String(item.text || '').replace(/\s+/g, ' ').trim();
      return `<a class="ai-signal-item" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span class="ai-signal-meta"><strong>${item.explicit_reset_claim ? radarText('radar.explicitReset', '明确重置信号') : radarText('radar.tiboSignal', 'Tibo 动态')}</strong><time datetime="${escapeHtml(item.at)}">${formatDateTime(item.at)}</time></span><p>${escapeHtml(text.length > 180 ? `${text.slice(0, 180)}…` : text)}</p></a>`;
    }).join('');
  }

  async function loadCodexReset() {
    sourceState('codex-reset', 'loading', radarText('radar.reading', '正在读取'));
    const stamp = Date.now();
    const [forecast, feed] = await Promise.all([
      fetchJson(`${CODEX_FORECAST_URL}?_=${stamp}`),
      get('[data-ai-codex-feed]') ? fetchJson(`${CODEX_FEED_URL}?_=${stamp}`) : null
    ]);
    state.forecast = forecast;
    state.codexFeed = feed;
    setProbability('codex-24', forecast.probabilities && forecast.probabilities.rounded_24h);
    setProbability('codex-48', forecast.probabilities && forecast.probabilities.rounded_48h);
    const confidenceLabels = { low: radarText('radar.lowConfidence', '低'), medium: radarText('radar.mediumConfidence', '中'), high: radarText('radar.highConfidence', '高') };
    setText('[data-ai-codex-confidence]', confidenceLabels[forecast.confidence] || forecast.confidence || '--');
    setText('[data-ai-codex-age]', Number.isFinite(Number(forecast.age_days)) ? `${Number(forecast.age_days).toFixed(1)} ${radarText('radar.days', '天')}` : '--');
    setText('[data-ai-codex-window]', forecast.time_window ? `${forecast.time_window.label} ${forecast.time_window.timezone}` : '--');
    renderCodexEvidence(forecast.evidence);
    if (feed) renderCodexFeed(feed);
    get('[data-ai-source-time="codex-reset"]').textContent = formatDateTime(forecast.updated_at || feed?.fetched_at);
    sourceState('codex-reset', 'live', radarText('radar.live', '实时'));
  }

  function willVerdict(value) {
    return {
      elevated: radarText('radar.verdictElevated', '高信号 · 保持关注'),
      watch: radarText('radar.verdictWatch', '观察信号 · 持续跟踪'),
      low: radarText('radar.verdictLow', '低信号 · 保持克制'),
      quiet: radarText('radar.verdictQuiet', '暂无明显信号')
    }[value] || radarText('radar.verdictUpdated', '预测信号已更新');
  }

  function renderWillPulse(payload) {
    const root = get('[data-ai-will-pulse]');
    if (!root) return;
    const events = (Array.isArray(payload.events) ? payload.events : []).filter((item) => Number(item.impact) > 0 || item.kind === 'reset' || item.kind === 'incident').slice(0, 5);
    if (!events.length) {
      root.innerHTML = `<p class="ai-feed-empty">${radarText('radar.noPulse', 'Forecast pulse 当前没有重要信号事件。')}</p>`;
      return;
    }
    root.innerHTML = events.map((item) => {
      const url = safeUrl(item.url, 'https://willcodexreset.com');
      const tag = item.kind === 'reset' ? radarText('radar.resetConfirmed', '已确认重置') : item.kind === 'incident' ? radarText('radar.serviceEvent', '服务事件') : radarText('radar.impact', '影响 +{impact}', { impact: Number(item.impact) || 0 });
      const body = `<span class="ai-signal-meta"><strong>${escapeHtml(item.title || radarText('radar.signalEvent', '信号事件'))}</strong><time datetime="${escapeHtml(item.occurredAt)}">${formatDateTime(item.occurredAt)}</time></span><p>${escapeHtml(String(item.detail || '').replace(/\s+/g, ' ').slice(0, 190))}</p><span class="ai-signal-impact">${escapeHtml(tag)}</span>`;
      return url ? `<a class="ai-signal-item" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}</a>` : `<div class="ai-signal-item">${body}</div>`;
    }).join('');
  }

  async function loadWillReset() {
    sourceState('will-reset', 'loading', radarText('radar.reading', '正在读取'));
    const response = await fetchJinaJson(WILL_RESET_URL);
    const payload = response && response.code === 0 ? response.data : response;
    if (!payload || typeof payload !== 'object') throw new Error('预测数据格式不正确');
    state.willPayload = payload;
    const chance24 = probability(payload.probability24h);
    const chance48 = probability(payload.probability48h);
    get('[data-ai-will-24]').textContent = chance24 === null ? '--' : `${chance24}%`;
    get('[data-ai-will-48]').textContent = chance48 === null ? '--' : `${chance48}%`;
    get('[data-ai-will-verdict]').textContent = willVerdict(payload.verdict);
    renderWillPulse(payload);
    get('[data-ai-source-time="will-reset"]').textContent = formatDateTime(payload.updatedAt);
    sourceState('will-reset', 'live', radarText('radar.live', '实时'));
  }

  const loaders = {
    'codex-current': loadCurrentScores,
    codexradar: loadScores,
    'codex-reset': loadCodexReset,
    'will-reset': loadWillReset
  };

  async function runSource(source) {
    const loader = loaders[source];
    if (!loader) return false;
    setSourceBusy(source, true);
    try {
      const result = await loader();
      return result === 'partial' ? 'partial' : true;
    } catch (error) {
      console.warn(`AI Radar source failed: ${source}`, error);
      if (source === 'codex-current') clearCurrentScores();
      sourceState(source, 'error', radarText('radar.failed', '读取失败'));
      return false;
    } finally {
      setSourceBusy(source, false);
    }
  }

  async function refreshAll() {
    const button = get('[data-ai-refresh-all]');
    const status = get('[data-ai-refresh-status]');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.textContent = radarText('radar.syncingData', '正在同步评分与预测数据…');
    const results = await Promise.all(Object.keys(loaders).map(runSource));
    const successCount = results.filter((result) => result === true).length;
    const partialCount = results.filter((result) => result === 'partial').length;
    status.textContent = successCount === results.length
      ? radarText('radar.updated', '全部已更新 · {time}', { time: new Date().toLocaleTimeString(window.PHDSXI18n ? window.PHDSXI18n.getLocale() : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) })
      : radarText('radar.partialDataUpdated', '已更新 {success} / {total} 组数据，失败项可单独重试', { success: successCount, total: results.length });
    if (partialCount) status.textContent += radarText('radar.partialSources', '；{count} 个来源部分可用，缺失维度可重试', { count: partialCount });
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }

  function refreshLocalizedData() {
    renderScoreSummary();
    if (state.forecast) {
      const confidenceLabels = { low: radarText('radar.lowConfidence', '低'), medium: radarText('radar.mediumConfidence', '中'), high: radarText('radar.highConfidence', '高') };
      get('[data-ai-codex-confidence]').textContent = confidenceLabels[state.forecast.confidence] || state.forecast.confidence || '--';
      get('[data-ai-codex-age]').textContent = Number.isFinite(Number(state.forecast.age_days)) ? `${Number(state.forecast.age_days).toFixed(1)} ${radarText('radar.days', '天')}` : '--';
      renderCodexEvidence(state.forecast.evidence);
      renderCodexFeed(state.codexFeed || {});
    }
    if (state.willPayload) {
      get('[data-ai-will-verdict]').textContent = willVerdict(state.willPayload.verdict);
      renderWillPulse(state.willPayload);
    }
  }

  window.PHDSXI18n?.onChange(refreshLocalizedData);

  get('[data-ai-score-search]')?.addEventListener('input', renderScoreRows);
  get('[data-ai-current-search]')?.addEventListener('input', renderCurrentRows);
  get('[data-ai-refresh-all]')?.addEventListener('click', refreshAll);
  getAll('[data-ai-refresh-all], [data-ai-refresh-source]').forEach((button) => { button.hidden = false; });
  getAll('[data-ai-refresh-source]').forEach((button) => button.addEventListener('click', async () => {
    const source = button.dataset.aiRefreshSource;
    const status = get('[data-ai-refresh-status]');
    status.textContent = radarText('radar.refreshing', '正在刷新 {source}…', { source });
    const success = await runSource(source);
    status.textContent = success === 'partial' ? radarText('radar.partialSourceUpdated', '可用评分已更新，缺失维度可稍后重试') : success ? radarText('radar.sourceUpdated', '该来源已更新 · {time}', { time: new Date().toLocaleTimeString(window.PHDSXI18n ? window.PHDSXI18n.getLocale() : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }) : radarText('radar.retry', '刷新失败，请稍后重试或打开来源站查看');
  }));
  refreshAll();
}());
