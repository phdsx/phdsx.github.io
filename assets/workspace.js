(() => {
  const tools = window.PHDSX_TOOLS || [];
  const favoritesKey = 'phdsx-favorite-tools';
  const recentKey = 'phdsx-recent-tools';
  const read = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? [...new Set(value)].filter(href => tools.some(tool => tool.href === href)) : [];
    } catch { return []; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  let favorites = read(favoritesKey);
  const t = (zh, en) => window.PHDSXI18n?.getLocale() === 'en' ? en : zh;
  let feedback = document.querySelector('[data-workspace-feedback]');
  if (!feedback) {
    feedback = document.createElement('p');
    feedback.className = 'workspace-feedback';
    feedback.setAttribute('role', 'status');
    document.querySelector('[data-directory-grid]')?.before(feedback);
  }
  const iconNames = {'image-compressor':['image','blue'],'image-cropper':['crop','purple'],'text-deduplicator':['file-text-fill','green'],'word-counter':['bar-chart-fill','peach'],'qr-generator':['qr-code','sky'],'ppt-countdown':['clock-fill','pink']};
  const decorateIcon = (img, href) => {
    const key = href.split('/').pop().replace('.html','');
    const icon = iconNames[key];
    if (!icon || !document.body.classList.contains('porcelain-page')) return;
    const tile = document.createElement('span'); tile.className = 'porcelain-icon icon-' + icon[1];
    img.src = 'assets/porcelain/icons/' + icon[0] + '.svg'; img.width = 48; img.height = 48;
    img.replaceWith(tile); tile.append(img);
  };
  document.querySelectorAll('[data-tool-href]').forEach(card => decorateIcon(card.querySelector('img'), card.dataset.toolHref));
  const makeCard = (tool) => {
    const article = document.createElement('article');
    article.className = 'workspace-card';
    article.dataset.toolHref = tool.href;
    const link = document.createElement('a');
    link.className = 'workspace-card-link';
    link.href = tool.href;
    const img = document.createElement('img');
    img.src = tool.icon; img.alt = ''; img.width = 40; img.height = 40;
    const copy = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = siteTranslate(tool.label);
    const desc = document.createElement('p'); desc.textContent = siteTranslate(tool.description);
    copy.append(title, desc); link.append(img, copy);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'pin-tool'; button.dataset.pin = tool.href;
    article.append(link, button);
    decorateIcon(img, tool.href);
    return article;
  };
  const syncButtons = () => document.querySelectorAll('[data-pin]').forEach(button => {
    const saved = favorites.includes(button.dataset.pin);
    const tool = tools.find(item => item.href === button.dataset.pin);
    button.hidden = false;
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', (saved ? t('取消收藏：', 'Unsave: ') : t('收藏：', 'Save: ')) + siteTranslate(tool.label));
    button.textContent = saved ? t('已收藏', 'Saved') : t('收藏', 'Save');
  });
  const renderHome = () => {
    const grid = document.querySelector('[data-shortcuts]');
    if (grid) {
      const defaults = ['image-compressor','image-cropper','text-deduplicator','word-counter','qr-generator','ppt-countdown'];
      const selected = favorites.length ? favorites.map(href => tools.find(tool => tool.href === href)) : defaults.map(name => tools.find(tool => tool.href.endsWith('/' + name + '.html')));
      grid.replaceChildren(...selected.map(makeCard));
      document.querySelector('[data-shortcuts-title]').textContent = favorites.length ? t('我的收藏', 'My favorites') : t('常用工具', 'Everyday tools');
      document.querySelector('[data-shortcuts-note]').textContent = favorites.length ? t('你的专属快捷入口，可在工具箱中继续添加。', 'Your shortcuts. Add more from the toolbox.') : t('高效、简洁、好用的在线工具。', 'Simple tools. Everyday possibilities.');
    }
    const recent = document.querySelector('[data-recent-tools]');
    if (recent) {
      const entries = read(recentKey).slice(0, 5);
      recent.replaceChildren(...entries.map(href => {
        const link = document.createElement('a'); link.href = href; link.textContent = siteTranslate(tools.find(tool => tool.href === href).label); return link;
      }));
      document.querySelector('[data-recent-section]').hidden = !entries.length;
    }
    syncButtons();
  };
  const directory = document.querySelector('[data-tool-directory]');
  const search = document.querySelector('#directory-search');
  let category = 'all';
  const filterDirectory = () => {
    if (!directory) return;
    const query = normalizeText(search.value);
    let count = 0;
    directory.querySelectorAll('[data-tool-href]').forEach(card => {
      const tool = tools.find(item => item.href === card.dataset.toolHref);
      const index = getSiteCatalog().find(item => item.href === tool.href);
      const text = normalizeText([tool.label, tool.description, siteTranslate(tool.label), siteTranslate(tool.description), index?.keywords].join(' '));
      const categoryMatches = category === 'all' || (category === 'saved' ? favorites.includes(tool.href) : tool.category === category);
      card.hidden = !categoryMatches || !query.split(/\s+/).every(word => text.includes(word));
      if (!card.hidden) count++;
    });
    document.querySelector('[data-directory-status]').textContent = t(`显示 ${count} 项工具`, `${count} tools shown`);
    document.querySelector('[data-directory-empty]').hidden = count > 0;
    document.querySelectorAll('[data-workspace-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspaceFilter === category)));
  };
  document.querySelectorAll('[data-workspace-filter]').forEach(button => button.addEventListener('click', () => { category = button.dataset.workspaceFilter; filterDirectory(); }));
  search?.addEventListener('input', filterDirectory);
  document.querySelector('[data-clear-filters]')?.addEventListener('click', () => { category = 'all'; search.value = ''; filterDirectory(); search.focus(); });
  document.addEventListener('click', event => {
    const pin = event.target.closest('[data-pin]');
    if (pin) {
      const href = pin.dataset.pin;
      favorites = favorites.includes(href) ? favorites.filter(item => item !== href) : [...favorites, href];
      const persisted = write(favoritesKey, favorites);
      const oldIndex = [...document.querySelectorAll('[data-shortcuts] [data-pin]')].indexOf(pin);
      renderHome(); filterDirectory();
      if (oldIndex >= 0) {
        const buttons = [...document.querySelectorAll('[data-shortcuts] [data-pin]')];
        (buttons.find(button => button.dataset.pin === href) || buttons[Math.min(oldIndex, buttons.length - 1)])?.focus();
      }
      if (feedback) feedback.textContent = persisted ? t('收藏已更新。', 'Favorites updated.') : t('浏览器无法保存，收藏仅在本次页面中有效。', 'Storage unavailable. Favorites apply to this page only.');
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link) return;
    const target = tools.find(tool => new URL(tool.href, location.href).pathname === new URL(link.href).pathname);
    if (target) write(recentKey, [target.href, ...read(recentKey).filter(href => href !== target.href)].slice(0, 5));
  });
  window.addEventListener('pageshow', () => { favorites = read(favoritesKey); renderHome(); filterDirectory(); });
  window.addEventListener('storage', event => { if ([favoritesKey, recentKey].includes(event.key)) { favorites = read(favoritesKey); renderHome(); filterDirectory(); } });
  siteOnLanguageChange(() => { renderHome(); filterDirectory(); });
  document.querySelectorAll('.porcelain-nav details').forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) document.querySelectorAll('.porcelain-nav details').forEach(other => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', event => {
    document.querySelectorAll('.porcelain-nav details[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.porcelain-nav details[open]').forEach(menu => { menu.open = false; menu.querySelector('summary').focus(); });
  });
  renderHome(); filterDirectory();
})();
