(() => {
  const form = document.querySelector('.home-search-form');
  const input = document.querySelector('#home-search');
  if (!form || !input) return;
  const providers = {
    bing: { label: 'Bing', action: 'https://www.bing.com/search', name: 'q' },
    baidu: { label: '百度', action: 'https://www.baidu.com/s', name: 'wd' },
    google: { label: 'Google', action: 'https://www.google.com/search', name: 'q' }
  };
  const modes = [...document.querySelectorAll('[data-search-mode]')];
  const engines = [...document.querySelectorAll('[data-search-engine]')];
  const engineRow = document.querySelector('.search-engines');
  const status = document.querySelector('[data-search-status]');
  const empty = document.querySelector('[data-search-empty]');
  const tools = [...document.querySelectorAll('[data-search-tool]')];
  const normalize = (text) => text.normalize('NFKC').trim().toLowerCase();
  const entries = tools.map((tool) => ({ tool, text: normalize(`${tool.textContent} ${tool.dataset.searchKeywords || ''}`) }));
  let mode = 'web';
  let provider = 'bing';

  function render() {
    const site = mode === 'site';
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const entry of entries) {
      entry.tool.hidden = site && !terms.every((term) => entry.text.includes(term));
      if (!entry.tool.hidden) count++;
    }
    engineRow.hidden = site;
    empty.hidden = !site || count > 0;
    status.textContent = site ? `找到 ${count} 个站内工具` : `使用 ${providers[provider].label} 搜索网页`;
    input.placeholder = site ? '搜索站内工具，例如 AI、拼音…' : '输入关键词搜索，按回车键…';
    modes.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.searchMode === mode)));
    engines.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.searchEngine === provider)));
    form.action = providers[provider].action;
    input.name = providers[provider].name;
  }

  modes.forEach((button) => button.addEventListener('click', () => { mode = button.dataset.searchMode; render(); }));
  engines.forEach((button) => button.addEventListener('click', () => { provider = button.dataset.searchEngine; render(); }));
  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { input.value = ''; render(); }
  });
  form.addEventListener('submit', (event) => {
    input.value = input.value.trim();
    if (!input.value) { event.preventDefault(); input.focus(); return; }
    if (mode === 'site') {
      event.preventDefault();
      render();
      tools.find((tool) => !tool.hidden)?.focus();
    }
  });
  document.querySelector('[data-search-clear]').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.focus(); input.select(); }
  });
  document.querySelectorAll('[data-search-enhanced]').forEach((element) => { element.hidden = false; });
  render();
})();
