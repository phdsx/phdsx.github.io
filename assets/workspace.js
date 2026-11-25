(() => {
  const tools = window.PHDSX_TOOLS || [];
  const directory = document.querySelector('[data-tool-directory]');
  if (!directory) return;
  const search = directory.querySelector('#directory-search');
  const t = (zh, en) => window.PHDSXI18n?.getLocale() === 'en' ? en : zh;
  let category = 'all';
  const readLocation = () => {
    const params = new URLSearchParams(location.search);
    const value = params.get('category');
    category = tools.some(tool => tool.category === value) ? value : 'all';
    search.value = params.get('q') || '';
  };
  const saveLocation = (push = false) => {
    const next = new URL(location.href);
    if (category === 'all') next.searchParams.delete('category'); else next.searchParams.set('category',category);
    if (search.value.trim()) next.searchParams.set('q',search.value); else next.searchParams.delete('q');
    if (next.href !== location.href) history[push ? 'pushState' : 'replaceState'](null,'',next);
    window.dispatchEvent(new Event('phdsx:location'));
  };
  readLocation();
  const catalog = new Map(getSiteCatalog().map(item => [item.href, item]));
  const makeCard = (tool) => {
    const article = document.createElement('article');
    article.className = 'workspace-card';
    article.dataset.toolHref = tool.href;
    article.dataset.toolCategory = tool.category;
    const link = document.createElement('a');
    link.className = 'workspace-card-link';
    link.href = tool.href;
    const img = document.createElement('img');
    img.src = tool.icon;
    img.alt = ''; img.width = 40; img.height = 40;
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = siteTranslate(tool.label);
    const desc = document.createElement('p');
    desc.textContent = siteTranslate(tool.description);
    copy.append(title, desc);
    link.append(img, copy);
    article.append(link);
    return article;
  };
  const filterTools = () => {
    const words = normalizeText(search.value).split(/\s+/).filter(Boolean);
    let count = 0;
    directory.querySelectorAll('[data-tool-href]').forEach(card => {
      const tool = tools.find(item => item.href === card.dataset.toolHref);
      if (!tool) return;
      const text = normalizeText([
        tool.label, tool.description, siteTranslate(tool.label, 'en'),
        siteTranslate(tool.description, 'en'), catalog.get(tool.href)?.keywords
      ].join(' '));
      card.hidden = !(category === 'all' || tool.category === category) || !words.every(word => text.includes(word));
      if (!card.hidden) count++;
    });

    directory.querySelector('[data-directory-status]').textContent = t(`显示 ${count} 项工具`, `${count} tools shown`);
    directory.querySelector('[data-directory-empty]').hidden = count > 0;
    directory.querySelectorAll('[data-workspace-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.workspaceFilter === category));
    });
  };
  const renderTools = () => {
    directory.querySelector('[data-directory-grid]').replaceChildren(...tools.map(makeCard));
    directory.querySelector('.directory-search span').textContent = t(`${tools.length} 项工具`, `${tools.length} tools`);
    filterTools();
  };
  directory.querySelectorAll('[data-workspace-filter]').forEach(button => {
    button.addEventListener('click', () => { category = button.dataset.workspaceFilter; filterTools(); saveLocation(true); });
  });
  search.addEventListener('input', () => {
    filterTools();
    saveLocation();
  });
  directory.querySelector('[data-clear-filters]').addEventListener('click', () => {
    category = 'all'; search.value = ''; filterTools(); saveLocation(true); search.focus();
  });
  window.addEventListener('pageshow', filterTools);
  window.addEventListener('popstate', () => { readLocation(); filterTools(); });
  siteOnLanguageChange(renderTools);
  renderTools();
})();
