/* Ubuntu desktop shell. Existing page content and tool/game state are preserved. */
(() => {
  const script = document.querySelector('script[src*="assets/design-system.js"]');
  const root = new URL('../', script.src);
  const path = location.pathname.slice(root.pathname.length);
  const home = path === '' || path === 'index.html';
  const game = path.startsWith('games/'), tool = path.startsWith('tools/');
  const body = document.body;
  const url = file => new URL(file, root).href;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#2c2929');
  body.classList.add('unified-page','ubuntu-page');
  if (tool) body.classList.add('unified-tool');
  if (game) body.classList.add('unified-game');
  const presentation = path.endsWith('ppt-countdown.html');
  if (presentation) body.classList.add('unified-presentation');
  body.classList.remove('has-site-sidebar','site-nav-open','phdsx-nav-open');
  document.querySelector('.phdsx-shell')?.remove();
  document.querySelector('.i18n-floating-toggle')?.remove();
  const icon = name => `<img class="ubuntu-icon" src="${url(`assets/ubuntu/icons/${name}.svg`)}" alt="" width="20" height="20">`;
  const label = (zh,en) => `<span data-ubuntu-zh="${zh}" data-ubuntu-en="${en}">${zh}</span>`;
  const hierarchy = window.PHDSXNavigation;
  let route = hierarchy.resolve(path, location.search, document.title.replace(/\s*[-·]\s*PHDSX.*$/, ''));
  const navItems = [
    ['index.html','首页','Home','house-door-fill',home],
    ['tools.html','在线工具','Tools','tools',tool || path === 'tools.html'],
    ['games.html','游戏厅','Games','controller',game || path === 'games.html'],
    ['blog.html','博客笔记','Blog','journal-text',path.startsWith('blog')],
    ['novels/index.html','小说连载','Reading','book-fill',path.startsWith('novels/')],
    ['ai-radar.html','AI 雷达','AI Radar','bullseye',path === 'ai-radar.html']
  ];
  const nav = () => navItems.map(([href,zh,en,symbol,active]) => `<a href="${url(href)}"${active ? ' aria-current="page"' : ''}>${icon(symbol)}${label(zh,en)}</a>`).join('');
  let header = document.querySelector('.site-header');
  if (!header) { header = document.createElement('header'); body.prepend(header); }
  header.className = 'ubuntu-titlebar';
  header.innerHTML = `<div class="ubuntu-history"><button type="button" data-ubuntu-back aria-label="后退">${icon('chevron-left')}</button><button type="button" data-ubuntu-forward aria-label="前进">${icon('chevron-right')}</button><a href="${url('index.html')}" aria-label="返回首页">${icon('house-door-fill')}</a></div><span class="ubuntu-window-title">${icon('folder-fill')}<strong>PHDSX</strong><span class="ubuntu-page-title"></span></span><div class="ubuntu-window-actions"><a href="${url('index.html#home-search')}" aria-label="搜索站内内容"><img class="ubuntu-icon" src="${url('assets/porcelain/icons/search.svg')}" alt=""></a><button type="button" data-ubuntu-menu aria-label="打开导航" aria-expanded="false" aria-controls="ubuntu-sidebar">${icon('list')}</button><span class="ubuntu-window-controls"><button type="button" data-ubuntu-minimize aria-label="最小化窗口">${icon('dash')}</button><button type="button" data-ubuntu-maximize aria-label="最大化窗口" aria-pressed="false">${icon('square')}</button><button type="button" data-ubuntu-close aria-label="收起窗口，显示桌面">${icon('x')}</button></span></div>`;
  if (!home) header.querySelector('.ubuntu-page-title').textContent = document.title.replace(/\s*[-·]\s*PHDSX.*$/, '');
  if (game || presentation) {
    // Keep immersive pages in place: their canvas and fixed controls depend on body geometry.
    body.classList.add('ubuntu-utility'); header.classList.add('unified-header');
    header.querySelector('.ubuntu-window-controls').remove();
    const menu = document.createElement('nav'); menu.id = 'ubuntu-sidebar'; menu.className = 'ubuntu-utility-menu'; menu.hidden = true;
    menu.setAttribute('aria-label','主导航'); menu.innerHTML = nav(); header.append(menu);
    header.querySelector('[data-ubuntu-menu]').addEventListener('click',event => { menu.hidden = !menu.hidden; event.currentTarget.setAttribute('aria-expanded',String(!menu.hidden)); });
    document.addEventListener('keydown',event => { if (event.key === 'Escape' && !menu.hidden) { menu.hidden = true; const trigger = header.querySelector('[data-ubuntu-menu]'); trigger.setAttribute('aria-expanded','false'); trigger.focus(); } });
    const lang = document.createElement('button'); lang.type = 'button'; lang.dataset.i18nToggle = ''; lang.textContent = 'EN'; header.querySelector('.ubuntu-window-actions').append(lang);
    const sync = () => body.style.setProperty('--unified-header-height',`${header.offsetHeight}px`);
    sync(); new ResizeObserver(sync).observe(header);
  } else {
    body.classList.remove('phdsx-has-shell');
    if (tool && !document.querySelector('main')) {
      const main = document.createElement('main'); main.className = 'ubuntu-tool-main';
      [...body.childNodes].filter(node => node.nodeType === 3 ? node.textContent.trim() : node.nodeType === 1 && !node.matches('header,script,style,link,footer,dialog,.phdsx-page-footer,.phdsx-skip-link')).forEach(node => main.append(node));
      body.append(main);
    }
    body.classList.add('ubuntu-desktop'); if (home) body.classList.add('ubuntu-home');
    const topbar = document.createElement('div'); topbar.className = 'ubuntu-topbar';
    topbar.innerHTML = `<button type="button" data-ubuntu-activities>${label('活动','Activities')}</button><span class="ubuntu-running-app"><img src="${url('assets/ubuntu/icons/web-browser.png')}" alt="" width="23" height="23">PHDSX</span><time class="ubuntu-clock"></time><div class="ubuntu-system"><button type="button" data-i18n-toggle>EN</button><span aria-hidden="true">${icon('wifi')}${icon('volume-up-fill')}${icon('battery-full')}</span><button type="button" data-ubuntu-desktop aria-label="显示桌面">${icon('power')}</button></div>`;
    const dock = document.createElement('nav'); dock.className = 'ubuntu-dock'; dock.setAttribute('aria-label','快捷启动');
    const docks = [['index.html','主页','org.gnome.Software'],['software.html','软件作品','web-browser'],['tools.html','在线工具','org.gnome.Nautilus'],['blog.html','博客笔记','utilities-terminal'],['novels/index.html','小说连载','help-browser'],['ai-radar.html','AI 雷达','bullseye']];
    dock.innerHTML = docks.map(([href,title,name]) => `<a href="${url(href)}" title="${title}" aria-label="${title}"${(home && href === 'index.html') || path === href ? ' aria-current="page"' : ''}>${name === 'bullseye' ? `<span class="ubuntu-radar-launcher">${icon('bullseye')}</span>` : `<img src="${url(`assets/ubuntu/icons/${name}.png`)}" alt="" width="48" height="48">`}</a>`).join('') + `<button type="button" data-ubuntu-settings title="外观设置" aria-label="外观设置"><img src="${url('assets/ubuntu/icons/preferences-system.png')}" alt="" width="48" height="48"></button><button type="button" class="ubuntu-all-apps" title="全部应用" aria-label="全部应用" aria-haspopup="dialog" aria-controls="ubuntu-apps" aria-expanded="false">${icon('grid-3x3-gap-fill')}</button>`;
    const shell = document.createElement('div'); shell.className = 'ubuntu-window'; header.before(shell); shell.append(header);
    const sidebar = document.createElement('aside'); sidebar.className = 'ubuntu-sidebar'; sidebar.id = 'ubuntu-sidebar';
    sidebar.innerHTML = `<a class="ubuntu-brand" href="${url('index.html')}">PHDSX</a><p>${label('让小事更简单','Make little things easier')}</p><nav aria-label="主导航">${nav()}</nav><nav class="ubuntu-secondary" aria-label="更多内容"><a href="${url('software.html')}">${icon('box-seam')}${label('软件作品','Software')}</a><a href="${url('directory.html')}">${icon('person-fill')}${label('电话黄页','Directory')}</a><a href="${url('brand-blacklist/index.html')}">${icon('journal-text')}${label('品牌黑名单','Brand blacklist')}</a><button type="button" data-ubuntu-settings>${icon('gear-fill')}${label('设置','Settings')}</button></nav><div class="ubuntu-sidebar-foot"><p>${label('好奇 · 实践 · 分享','Explore · Create · Share')}<br>${label('让技术更贴近生活。','Make technology feel human.')}</p><span>PHDSX © 2026</span></div>`;
    shell.append(sidebar);
    const content = document.createElement('div'); content.className = 'ubuntu-content';
    const main = document.querySelector('main');
    if (main) {
      if (tool) {
        const wrapper = main.parentElement;
        if (wrapper !== body) {
          wrapper.querySelectorAll(':scope > header').forEach(oldHeader => { oldHeader.classList.add('ubuntu-tool-heading'); main.prepend(oldHeader); });
          wrapper.querySelectorAll(':scope > footer').forEach(footer => { footer.classList.add('site-footer'); main.append(footer); });
        }
        body.querySelectorAll(':scope > header').forEach(oldHeader => { oldHeader.classList.add('ubuntu-tool-heading'); main.prepend(oldHeader); });
        body.querySelectorAll(':scope > .container').forEach(toolbar => { if (!toolbar.contains(main)) { toolbar.classList.add('ubuntu-tool-toolbar'); main.prepend(toolbar); } });
        body.querySelectorAll(':scope > footer').forEach(footer => { footer.classList.add('site-footer'); main.append(footer); });
      }
      content.append(main);
      if (tool) body.querySelectorAll(':scope > .container').forEach(wrapper => { if (!wrapper.children.length) wrapper.remove(); });
    }
    const footer = document.querySelector('.site-footer'); if (footer) content.append(footer);
    shell.append(content); body.prepend(topbar,dock);
    const apps = document.createElement('dialog');
    apps.id = 'ubuntu-apps'; apps.className = 'ubuntu-apps'; apps.setAttribute('aria-labelledby','ubuntu-apps-title');
    const appItems = [...navItems, ['software.html','软件作品','Software','box-seam'], ['directory.html','电话黄页','Directory','person-fill'], ['brand-blacklist/index.html','品牌黑名单','Brand blacklist','journal-text']];
    apps.innerHTML = `<header class="ubuntu-apps-heading"><h2 id="ubuntu-apps-title">${label('全部应用','All applications')}</h2><form method="dialog"><button type="submit" aria-label="关闭全部应用">${icon('x')}</button></form></header><nav class="ubuntu-apps-grid" aria-label="应用入口">${appItems.map(([href,zh,en,symbol]) => `<a href="${url(href)}"><span class="ubuntu-app-symbol">${icon(symbol)}</span>${label(zh,en)}</a>`).join('')}</nav>`;
    body.append(apps);
    const appsButton = dock.querySelector('.ubuntu-all-apps');
    appsButton.addEventListener('click', () => { apps.showModal(); appsButton.setAttribute('aria-expanded','true'); });
    apps.addEventListener('close', () => { appsButton.setAttribute('aria-expanded','false'); appsButton.focus(); });
    const desktop = document.createElement('div'); desktop.className = 'ubuntu-desktop-launcher'; desktop.hidden = true;
    desktop.innerHTML = `<button type="button" data-ubuntu-restore><img src="${url('assets/ubuntu/icons/org.gnome.Nautilus.png')}" alt="" width="64" height="64"><strong>PHDSX</strong>${label('打开个人主页窗口','Open your workspace')}</button>`; body.append(desktop);
    const settings = document.createElement('dialog'); settings.className = 'ubuntu-settings';
    settings.innerHTML = `<form method="dialog"><h2>${label('外观设置','Appearance')}</h2><p>Ubuntu · PHDSX</p><label class="ubuntu-setting-row">${label('展开窗口','Expand window')}<input type="checkbox" data-ubuntu-expand></label><div class="ubuntu-setting-row">${label('界面语言','Language')}<button type="button" data-i18n-toggle>EN</button></div><button class="ubuntu-dialog-done" value="done">${label('完成','Done')}</button></form>`; body.append(settings);
    const setMaximized = active => { body.classList.toggle('ubuntu-maximized',active); header.querySelector('[data-ubuntu-maximize]').setAttribute('aria-pressed',String(active)); settings.querySelector('input').checked = active; };
    const setMinimized = active => { shell.hidden = active; desktop.hidden = !active; (active ? desktop.querySelector('button') : header.querySelector('[data-ubuntu-minimize]')).focus(); };
    header.querySelector('[data-ubuntu-maximize]').addEventListener('click',() => setMaximized(!body.classList.contains('ubuntu-maximized')));
    settings.querySelector('input').addEventListener('change',event => setMaximized(event.target.checked));
    body.querySelectorAll('[data-ubuntu-settings]').forEach(button => button.addEventListener('click',() => settings.showModal()));
    body.querySelectorAll('[data-ubuntu-minimize],[data-ubuntu-close],[data-ubuntu-desktop]').forEach(button => button.addEventListener('click',() => setMinimized(true)));
    desktop.querySelector('button').addEventListener('click',() => setMinimized(false));
    topbar.querySelector('[data-ubuntu-activities]').addEventListener('click',() => { setMinimized(false); apps.showModal(); appsButton.setAttribute('aria-expanded','true'); });
    const mobileNavigation = matchMedia('(max-width:700px)');
    const navigationButton = header.querySelector('[data-ubuntu-menu]');
    const setNavigation = open => {
      body.classList.toggle('ubuntu-nav-open', mobileNavigation.matches && open);
      body.classList.toggle('ubuntu-nav-collapsed', !mobileNavigation.matches && !open);
      navigationButton.setAttribute('aria-expanded', String(open));
    };
    setNavigation(!mobileNavigation.matches);
    mobileNavigation.addEventListener('change', () => setNavigation(!mobileNavigation.matches));
    navigationButton.addEventListener('click', () => setNavigation(navigationButton.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown',event => { if (event.key === 'Escape') { if (mobileNavigation.matches && body.classList.contains('ubuntu-nav-open')) { setNavigation(false); navigationButton.focus(); } if (shell.hidden) setMinimized(false); } });
    document.addEventListener('click',event => { if (mobileNavigation.matches && !sidebar.contains(event.target) && !event.target.closest('[data-ubuntu-menu]')) setNavigation(false); });
    const updateClock = () => { const now = new Date(); const locale = window.PHDSXI18n?.getLocale() === 'en' ? 'en-GB' : 'zh-CN'; const clock = topbar.querySelector('time'); clock.dateTime = now.toISOString(); clock.textContent = new Intl.DateTimeFormat(locale,{month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false}).format(now); };
    updateClock(); setInterval(updateClock,30000); window.PHDSXI18n?.onChange(updateClock);
  }
  // A stable parent link is separate from browser history; direct deep links work too.
  const locationBar = document.createElement('div'); locationBar.className = 'ubuntu-locationbar';
  const breadcrumbs = document.createElement('nav'); breadcrumbs.className = 'ubuntu-breadcrumbs'; breadcrumbs.setAttribute('aria-label','当前位置');
  const parentLink = document.createElement('a'); parentLink.className = 'ubuntu-parent';
  parentLink.innerHTML = icon('chevron-left') + label('返回上级','Up one level');
  locationBar.append(breadcrumbs,parentLink);
  if (!home) {
    if (game || presentation) header.append(locationBar);
    else document.querySelector('.ubuntu-content').prepend(locationBar);
  }
  const contextual = document.createElement('nav'); contextual.className = 'ubuntu-context-nav'; contextual.setAttribute('aria-label','当前栏目分类');
  if (route.family) document.querySelector('#ubuntu-sidebar a[aria-current]')?.after(contextual);
  const currentTitle = () => document.querySelector('[data-chapter-title], [data-post-title], .blacklist-detail-title h1, main h1')?.textContent.trim() || document.title.replace(/\s*[-·]\s*PHDSX.*$/, '');
  const updateLocation = () => {
    route = hierarchy.resolve(path, location.search, currentTitle());
    const en = window.PHDSXI18n?.getLocale() === 'en';
    const list = document.createElement('ol');
    route.crumbs.forEach((crumb,index) => {
      const li = document.createElement('li'); const last = index === route.crumbs.length - 1;
      const node = document.createElement(last ? 'span' : 'a');
      node.textContent = en ? crumb.en : crumb.zh;
      if (last) { node.setAttribute('aria-current','page'); node.title = node.textContent; }
      else node.href = url(crumb.href);
      li.append(node); list.append(li);
    });
    breadcrumbs.replaceChildren(list);
    parentLink.hidden = !route.parent;
    if (route.parent) { parentLink.href = url(route.parent.href); parentLink.title = (en ? 'Return to ' : '返回：') + (en ? route.parent.en : route.parent.zh); }
    contextual.replaceChildren();
    Object.entries(hierarchy.categories[route.family] || {}).forEach(([key,names]) => {
      const link = document.createElement('a'); link.href = url(`${route.family}.html?category=${key}`); link.textContent = names[en ? 1 : 0];
      if (route.category === key) link.setAttribute('aria-current','location');
      contextual.append(link);
    });
    document.querySelectorAll('.ubuntu-secondary a,.ubuntu-dock a').forEach(link => {
      if (link.href === url(route.section)) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    if (!home) header.querySelector('.ubuntu-page-title').textContent = route.crumbs.at(-1)[en ? 'en' : 'zh'];
  };
  updateLocation();
  window.addEventListener('phdsx:location',updateLocation);
  window.addEventListener('popstate',updateLocation);
  const heading = document.querySelector('[data-chapter-title], [data-post-title], [data-blacklist-detail], main h1');
  if (heading) new MutationObserver(updateLocation).observe(heading,{childList:true,characterData:true,subtree:true});
  // Games retain their canvas geometry while using the same category links and chrome.
  if (path === 'games.html') {
    const filters = document.createElement('div'); filters.className = 'ubuntu-game-filters workspace-filters'; filters.setAttribute('role','group'); filters.setAttribute('aria-label','游戏分类');
    const status = document.createElement('p'); status.className = 'ubuntu-directory-status'; status.setAttribute('role','status');
    const grid = document.querySelector('.games-directory-grid'); grid.before(filters,status);
    const filterGames = () => {
      const en = window.PHDSXI18n?.getLocale() === 'en';
      const selected = hierarchy.resolve(path,location.search).category;
      filters.replaceChildren();
      Object.entries({all:['全部游戏','All games'],...hierarchy.categories.games}).forEach(([key,names]) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = names[en ? 1 : 0]; button.setAttribute('aria-pressed',String((selected || 'all') === key));
        button.addEventListener('click',() => { const next = new URL(location.href); if (key === 'all') next.searchParams.delete('category'); else next.searchParams.set('category',key); history.pushState(null,'',next); filterGames(); updateLocation(); });
        filters.append(button);
      });
      let count = 0;
      grid.querySelectorAll('.games-directory-card').forEach(card => { card.hidden = !!selected && !card.getAttribute('href').startsWith(`games/${selected}/`); if (!card.hidden) count++; });
      status.textContent = en ? `${count} games shown` : `显示 ${count} 款游戏`;
    };
    filterGames(); window.addEventListener('popstate',filterGames); window.PHDSXI18n?.onChange(filterGames);
  }
  header.querySelector('[data-ubuntu-back]').addEventListener('click',() => { if (history.length > 1) history.back(); else location.href = url('index.html'); });
  header.querySelector('[data-ubuntu-forward]').addEventListener('click',() => history.forward());
  const translateShell = () => { const en = window.PHDSXI18n?.getLocale() === 'en'; document.querySelectorAll('[data-ubuntu-zh]').forEach(node => { node.textContent = en ? node.dataset.ubuntuEn : node.dataset.ubuntuZh; }); };
  translateShell(); window.PHDSXI18n?.onChange(translateShell);
  window.PHDSXI18n?.onChange(updateLocation);
  window.dispatchEvent(new Event('resize'));
})();
