(function () {
  const SOFTWARE_URL = 'https://codexradar.com/data/intelligence-efficiency.json';
  const VISUAL_URL = 'http://codexradar.com/api/visual-spatial-reasoning';
  const CODEX_FORECAST_URL = 'https://codex-reset.com/api/forecast';
  const CODEX_FEED_URL = 'https://codex-reset.com/api/feed';
  const WILL_RESET_URL = 'http://willcodexreset.com/api/reset-radar';
  const JINA_BASE = 'https://r.jina.ai/';
  const state = { scoreRows: [] };

  function get(selector, root) {
    return (root || document).querySelector(selector);
  }

  function getAll(selector, root) {
    return [...(root || document).querySelectorAll(selector)];
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
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatScore(value) {
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
    return labels[model] || String(model || '未知模型').replace(/^gpt-/i, 'GPT-');
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
    label.textContent = row ? `${formatModel(row.model)} · ${row.effort}` : '暂无可用数据';
  }

  function renderScoreRows() {
    const list = get('[data-ai-score-list]');
    const count = get('[data-ai-score-count]');
    const query = String(get('[data-ai-score-search]')?.value || '').trim().toLowerCase();
    const rows = state.scoreRows.filter((row) => `${formatModel(row.model)} ${row.model} ${row.effort}`.toLowerCase().includes(query));
    if (!rows.length) {
      list.innerHTML = `<tr><td colspan="5" class="ai-loading-cell">${state.scoreRows.length ? '没有匹配的模型档位。' : '暂时没有可合并的评分数据。'}</td></tr>`;
    } else {
      list.innerHTML = rows.map((row) => `
        <tr>
          <td class="ai-score-rank">#${row.rank}</td>
          <td><span class="ai-model-name">${escapeHtml(formatModel(row.model))}</span><span class="ai-model-effort">${escapeHtml(row.effort)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.combined.toFixed(2)}">${formatScore(row.combined)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.software.toFixed(2)}">${formatScore(row.software)}</span></td>
          <td><span class="ai-score-value" style="--score:${row.visual.toFixed(2)}">${formatScore(row.visual)}</span></td>
        </tr>`).join('');
    }
    count.textContent = `显示 ${rows.length} / ${state.scoreRows.length} 个共同有效档位`;
  }

  async function loadScores() {
    sourceState('codexradar', 'loading', '正在读取');
    const stamp = Date.now();
    const [softwarePayload, visualPayload] = await Promise.all([
      fetchJson(`${SOFTWARE_URL}?v=${stamp}`),
      fetchJinaJson(VISUAL_URL)
    ]);
    const software = Array.isArray(softwarePayload.points) ? softwarePayload.points : [];
    const visual = Array.isArray(visualPayload.points) ? visualPayload.points : [];
    const visualMap = new Map(visual.map((point) => [`${point.model}|${point.effort}`, point]));
    state.scoreRows = software.map((point) => {
      const match = visualMap.get(`${point.model}|${point.effort}`);
      const softwareScore = Number(point.iq);
      const visualScore = Number(match && match.iq);
      if (!Number.isFinite(softwareScore) || !Number.isFinite(visualScore)) return null;
      return {
        model: point.model,
        effort: point.effort,
        software: softwareScore,
        visual: visualScore,
        combined: (softwareScore + visualScore) / 2
      };
    }).filter(Boolean).sort((left, right) => right.combined - left.combined).map((row, index) => ({ ...row, rank: index + 1 }));

    const bestCombined = state.scoreRows[0];
    const bestSoftware = [...state.scoreRows].sort((left, right) => right.software - left.software)[0];
    const bestVisual = [...state.scoreRows].sort((left, right) => right.visual - left.visual)[0];
    renderBest('combined', bestCombined, bestCombined && bestCombined.combined);
    renderBest('software', bestSoftware, bestSoftware && bestSoftware.software);
    renderBest('visual', bestVisual, bestVisual && bestVisual.visual);
    renderScoreRows();
    const sourceTime = [softwarePayload.source_updated_at, visualPayload.source_updated_at].filter(Boolean).sort().pop();
    get('[data-ai-source-time="codexradar"]').textContent = formatDateTime(sourceTime);
    sourceState('codexradar', 'live', '实时');
  }

  function setProbability(key, value) {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    const card = get(`[data-ai-probability-card="${key}"]`);
    const label = get(`[data-ai-probability="${key}"]`);
    if (card) card.style.setProperty('--probability', numeric);
    if (label) label.textContent = `${numeric}%`;
  }

  function renderCodexEvidence(items) {
    const list = get('[data-ai-codex-evidence]');
    const evidence = Array.isArray(items) ? items.slice(0, 4) : [];
    if (!evidence.length) {
      list.innerHTML = '<li class="ai-feed-empty">当前没有公开预测依据。</li>';
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
    const tweets = (Array.isArray(payload.tweets) ? payload.tweets : []).filter((item) => item.tibo_lane === 'reset_related' || item.explicit_reset_claim || item.kind === 'candidate').slice(0, 4);
    if (!tweets.length) {
      root.innerHTML = '<p class="ai-feed-empty">当前没有可展示的雷达动态。</p>';
      return;
    }
    root.innerHTML = tweets.map((item) => {
      const url = safeUrl(item.url, 'https://x.com');
      const text = String(item.text || '').replace(/\s+/g, ' ').trim();
      return `<a class="ai-signal-item" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span class="ai-signal-meta"><strong>${item.explicit_reset_claim ? '明确重置信号' : 'Tibo 动态'}</strong><time datetime="${escapeHtml(item.at)}">${formatDateTime(item.at)}</time></span><p>${escapeHtml(text.length > 180 ? `${text.slice(0, 180)}…` : text)}</p></a>`;
    }).join('');
  }

  async function loadCodexReset() {
    sourceState('codex-reset', 'loading', '正在读取');
    const stamp = Date.now();
    const [forecast, feed] = await Promise.all([
      fetchJson(`${CODEX_FORECAST_URL}?_=${stamp}`),
      fetchJson(`${CODEX_FEED_URL}?_=${stamp}`)
    ]);
    setProbability('codex-24', forecast.probabilities && forecast.probabilities.rounded_24h);
    setProbability('codex-48', forecast.probabilities && forecast.probabilities.rounded_48h);
    const confidenceLabels = { low: '低', medium: '中', high: '高' };
    get('[data-ai-codex-confidence]').textContent = confidenceLabels[forecast.confidence] || forecast.confidence || '--';
    get('[data-ai-codex-age]').textContent = Number.isFinite(Number(forecast.age_days)) ? `${Number(forecast.age_days).toFixed(1)} 天` : '--';
    get('[data-ai-codex-window]').textContent = forecast.time_window ? `${forecast.time_window.label} ${forecast.time_window.timezone}` : '--';
    renderCodexEvidence(forecast.evidence);
    renderCodexFeed(feed);
    get('[data-ai-source-time="codex-reset"]').textContent = formatDateTime(forecast.updated_at || feed.fetched_at);
    sourceState('codex-reset', 'live', '实时');
  }

  function willVerdict(value) {
    return {
      elevated: '高信号 · 保持关注',
      watch: '观察信号 · 持续跟踪',
      low: '低信号 · 保持克制',
      quiet: '暂无明显信号'
    }[value] || '预测信号已更新';
  }

  function renderWillPulse(payload) {
    const root = get('[data-ai-will-pulse]');
    const events = (Array.isArray(payload.events) ? payload.events : []).filter((item) => Number(item.impact) > 0 || item.kind === 'reset' || item.kind === 'incident').slice(0, 5);
    if (!events.length) {
      root.innerHTML = '<p class="ai-feed-empty">Forecast pulse 当前没有重要信号事件。</p>';
      return;
    }
    root.innerHTML = events.map((item) => {
      const url = safeUrl(item.url, 'https://willcodexreset.com');
      const tag = item.kind === 'reset' ? '已确认重置' : item.kind === 'incident' ? '服务事件' : `影响 +${Number(item.impact) || 0}`;
      const body = `<span class="ai-signal-meta"><strong>${escapeHtml(item.title || '信号事件')}</strong><time datetime="${escapeHtml(item.occurredAt)}">${formatDateTime(item.occurredAt)}</time></span><p>${escapeHtml(String(item.detail || '').replace(/\s+/g, ' ').slice(0, 190))}</p><span class="ai-signal-impact">${escapeHtml(tag)}</span>`;
      return url ? `<a class="ai-signal-item" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}</a>` : `<div class="ai-signal-item">${body}</div>`;
    }).join('');
  }

  async function loadWillReset() {
    sourceState('will-reset', 'loading', '正在读取');
    const response = await fetchJinaJson(WILL_RESET_URL);
    const payload = response && response.code === 0 ? response.data : response;
    if (!payload || typeof payload !== 'object') throw new Error('预测数据格式不正确');
    get('[data-ai-will-24]').textContent = `${Number(payload.probability24h) || 0}%`;
    get('[data-ai-will-48]').textContent = `${Number(payload.probability48h) || 0}%`;
    get('[data-ai-will-verdict]').textContent = willVerdict(payload.verdict);
    renderWillPulse(payload);
    get('[data-ai-source-time="will-reset"]').textContent = formatDateTime(payload.updatedAt);
    sourceState('will-reset', 'live', '实时');
  }

  const loaders = {
    codexradar: loadScores,
    'codex-reset': loadCodexReset,
    'will-reset': loadWillReset
  };

  async function runSource(source) {
    const loader = loaders[source];
    if (!loader) return false;
    setSourceBusy(source, true);
    try {
      await loader();
      return true;
    } catch (error) {
      console.warn(`AI Radar source failed: ${source}`, error);
      sourceState(source, 'error', '读取失败');
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
    status.textContent = '正在同步三个来源…';
    const results = await Promise.all(Object.keys(loaders).map(runSource));
    const successCount = results.filter(Boolean).length;
    status.textContent = successCount === results.length
      ? `全部已更新 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : `已更新 ${successCount} / ${results.length} 个来源，失败项可单独重试`;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }

  get('[data-ai-score-search]')?.addEventListener('input', renderScoreRows);
  get('[data-ai-refresh-all]')?.addEventListener('click', refreshAll);
  getAll('[data-ai-refresh-source]').forEach((button) => button.addEventListener('click', async () => {
    const source = button.dataset.aiRefreshSource;
    const status = get('[data-ai-refresh-status]');
    status.textContent = `正在刷新 ${source}…`;
    const success = await runSource(source);
    status.textContent = success ? `该来源已更新 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '刷新失败，请稍后重试或打开来源站查看';
  }));
  refreshAll();
}());
