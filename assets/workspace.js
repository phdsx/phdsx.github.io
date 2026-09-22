(() => {
  const tools = window.PHDSX_TOOLS || [];
  const home = document.querySelector('[data-home-tools]');
  const directory = document.querySelector('[data-tool-directory]');
  const surface = home || directory;
  const search = document.querySelector('[data-tool-search], #directory-search');
  const t = (zh, en) => window.PHDSXI18n?.getLocale() === 'en' ? en : zh;
  const common = new Set(['image-compressor', 'image-cropper', 'text-deduplicator', 'word-counter', 'qr-generator', 'ppt-countdown']);
  const ubuntuIcons = {
    'image-compressor': ['image', 'image'],
    'image-cropper': ['crop', 'crop'],
    'text-deduplicator': ['file-text-fill', 'text'],
    'word-counter': ['bar-chart-fill', 'count'],
    'qr-generator': ['qr-code', 'qr'],
    'ppt-countdown': ['display', 'ppt']
  };
  let category = home ? 'common' : 'all';
  const readLocation = () => {
    if (!directory) return;
    const params = new URLSearchParams(location.search);
    const value = params.get('category');
    category = tools.some(tool => tool.category === value) ? value : 'all';
    search.value = params.get('q') || '';
  };
  const saveLocation = (push = false) => {
    if (!directory) return;
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
    const id = tool.href.split('/').pop().replace('.html', '');
    const categoryIcons = {image:['image','image'],text:['file-text-fill','text'],document:['display','ppt'],time:['clock-fill','count'],lifestyle:['bar-chart-fill','crop'],media:['display','qr']};
    const appIcon = ubuntuIcons[id] || categoryIcons[tool.category];
    img.src = appIcon ? `assets/${appIcon[0] === 'display' ? 'ubuntu' : 'porcelain'}/icons/${appIcon[0]}.svg` : tool.icon;
    img.alt = ''; img.width = 40; img.height = 40;
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = home && id === 'ppt-countdown' ? t('PPT 倒计时', 'PPT timer') : siteTranslate(tool.label);
    const desc = document.createElement('p');
    desc.textContent = siteTranslate(tool.description);
    copy.append(title, desc);
    if (appIcon) {
      const tile = document.createElement('span'); tile.className = `ubuntu-tool-icon icon-${appIcon[1]}`;
      tile.append(img); link.append(tile, copy);
    } else link.append(img, copy);
    article.append(link);
    return article;
  };
  const filterTools = () => {
    if (!surface || !search) return;
    const words = normalizeText(search.value).split(/\s+/).filter(Boolean);
    let count = 0;
    surface.querySelectorAll('[data-tool-href]').forEach(card => {
      const tool = tools.find(item => item.href === card.dataset.toolHref);
      if (!tool) return;
      const text = normalizeText([
        tool.label, tool.description, siteTranslate(tool.label, 'en'),
        siteTranslate(tool.description, 'en'), catalog.get(tool.href)?.keywords
      ].join(' '));
      card.hidden = !(category === 'all' || (category === 'common' ? common.has(tool.href.split('/').pop().replace('.html', '')) : tool.category === category)) || !words.every(word => text.includes(word));
      if (!card.hidden) count++;
    });

    surface.querySelector('[data-directory-status]').textContent = t(`显示 ${count} 项工具`, `${count} tools shown`);
    surface.querySelector('[data-directory-empty]').hidden = count > 0;
    surface.querySelectorAll('[data-workspace-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.workspaceFilter === category));
    });
  };
  const renderTools = () => {
    if (!surface) return;
    if (home) {
      const order = [...common];
      const sorted = [...tools].sort((a, b) => {
        const rank = item => { const index = order.indexOf(item.href.split('/').pop().replace('.html', '')); return index < 0 ? 100 : index; };
        return rank(a) - rank(b);
      });
      home.querySelector('[data-home-tool-grid]').replaceChildren(...sorted.map(makeCard));
      home.querySelector('[data-tool-total]').textContent = t(`${tools.length} 项工具`, `${tools.length} tools`);
    } else {
      directory.querySelector('[data-directory-grid]').replaceChildren(...tools.map(makeCard));
      directory.querySelector('.directory-search span').textContent = t(`${tools.length} 项工具`, `${tools.length} tools`);
    }
    filterTools();
  };
  surface?.querySelectorAll('[data-workspace-filter]').forEach(button => {
    button.addEventListener('click', () => { category = button.dataset.workspaceFilter; filterTools(); saveLocation(true); });
  });
  search?.addEventListener('input', () => {
    // A new query searches every tool, including ones outside the default six.
    if (category === 'common' && search.value.trim()) category = 'all';
    filterTools();
    saveLocation();
  });
  surface?.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    category = 'all'; search.value = ''; filterTools(); saveLocation(true); search.focus();
  });
  window.addEventListener('pageshow', filterTools);
  window.addEventListener('popstate', () => { readLocation(); filterTools(); });
  siteOnLanguageChange(renderTools);
  document.querySelectorAll('.porcelain-nav details').forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) document.querySelectorAll('.porcelain-nav details').forEach(other => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', event => {
    document.querySelectorAll('.porcelain-nav details[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.porcelain-nav details[open]').forEach(menu => { menu.open = false; menu.querySelector('summary').focus(); });
  });
  renderTools();
})();
