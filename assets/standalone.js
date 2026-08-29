(function () {
  if (document.querySelector('.phdsx-shell')) return;

  const script = document.currentScript;
  const home = script && script.dataset.home ? script.dataset.home : 'index.html';
  const returnUrl = script && script.dataset.return ? script.dataset.return : home;
  const root = home.replace(/index\.html(?:[?#].*)?$/i, '');
  const title = document.title.replace(/\s*-\s*PHDSX\s*$/i, '') || '功能页面';
  const section = getSection(returnUrl);
  const immersive = section === 'games' || /ppt-countdown\.html$/i.test(location.pathname);
  const compact = /ppt-countdown\.html$/i.test(location.pathname);
  const gameNavigation = section === 'games' ? `
        <span class="phdsx-shell__group-label">游戏分类</span>
        ${gameLink(root + 'ChineseChess.html', 'ChineseChess.html', '将', '中国象棋')}
        ${gameLink(root + 'Games/tetris.html', 'Games/tetris.html', '田', '俄罗斯方块')}
        ${gameLink(root + 'Games/dinnerninja/index.html', 'Games/dinnerninja/index.html', '切', '水果忍者')}
        ${gameLink(root + 'Games/submarine-battle.html', 'Games/submarine-battle.html', '潜', '潜艇大战')}
        ${gameLink(root + 'Games/parking-pulse.html', 'Games/parking-pulse.html', '泊', 'Parking Pulse')}
        ${gameLink(root + 'Games/sand-sort.html', 'Games/sand-sort.html', '沙', '沙子分类')}` : '';

  document.documentElement.classList.add('phdsx-themed');
  document.body.classList.add('phdsx-has-shell');
  if (immersive) document.body.classList.add('phdsx-immersive');
  if (section === 'games') document.body.classList.add('phdsx-game-page');

  const main = document.querySelector('main');
  let skip = null;
  if (main && !main.id) main.id = 'main-content';
  if (main) {
    skip = document.createElement('a');
    skip.className = 'phdsx-skip-link';
    skip.href = '#main-content';
    skip.textContent = '跳到主要内容';
  }

  const shell = document.createElement('header');
  shell.className = 'phdsx-shell' + (compact ? ' phdsx-shell--compact' : '');
  shell.innerHTML = `
    <div class="phdsx-shell__bar">
      <a class="phdsx-shell__brand" href="${home}" aria-label="返回 PHDSX 首页">
        <span class="phdsx-shell__mark">P</span>
        <span class="phdsx-shell__brand-copy"><strong>PHDSX</strong><small>PERSONAL HUB</small></span>
      </a>
      <div class="phdsx-shell__current"><span>${sectionLabel(section)}</span><strong>${escapeHtml(title)}</strong></div>
      <button class="phdsx-shell__toggle" type="button" aria-expanded="false" aria-controls="phdsx-shell-navigation" aria-label="展开站点导航"><span></span><span></span><span></span></button>
      <nav class="phdsx-shell__nav" id="phdsx-shell-navigation" aria-label="主导航">
        <span class="phdsx-shell__group-label">站点</span>
        ${navLink(root + 'index.html', 'home', '⌂', '首页')}
        ${navLink(root + 'tools.html', 'tools', '⌘', '工具')}
        ${navLink(root + 'games.html', 'games', '◇', '游戏')}
        ${navLink(root + 'blog.html', 'blog', '▤', '博客')}
        ${navLink(root + 'directory.html', 'directory', '☷', '黄页')}
        <span class="phdsx-shell__group-label">阅读</span>
        ${navLink(root + 'novels.html', 'novels', '▥', '小说')}
        <span class="phdsx-shell__group-label">发布与记录</span>
        ${navLink(root + 'software.html', 'software', '▣', '软件作品')}
        ${navLink(root + 'ai-radar.html', 'radar', '◎', 'AI 雷达')}
        ${navLink(root + 'brand-blacklist.html', 'blacklist', '!', '品牌黑名单')}
        ${gameNavigation}
      </nav>
      <a class="phdsx-shell__back" href="${returnUrl}">返回${sectionLabel(section)}</a>
    </div>`;

  document.body.prepend(shell);
  if (skip) document.body.insertBefore(skip, shell);

  const toggle = shell.querySelector('.phdsx-shell__toggle');
  const closeNavigation = function (restoreFocus) {
    shell.classList.remove('is-open');
    document.body.classList.remove('phdsx-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '展开站点导航');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', function () {
    const open = shell.classList.toggle('is-open');
    document.body.classList.toggle('phdsx-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起站点导航' : '展开站点导航');
  });
  shell.querySelectorAll('.phdsx-shell__link').forEach(function (link) {
    link.addEventListener('click', function () { closeNavigation(false); });
  });
  document.addEventListener('click', function (event) {
    if (shell.classList.contains('is-open') && !shell.contains(event.target)) closeNavigation(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && shell.classList.contains('is-open')) closeNavigation(true);
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', function (event) {
    if (event.matches) closeNavigation(false);
  });

  if (!immersive) {
    const footer = document.createElement('footer');
    footer.className = 'phdsx-page-footer';
    footer.innerHTML = `<span>PHDSX 个人主页</span><a href="${returnUrl}">返回${sectionLabel(section)}</a>`;
    document.body.appendChild(footer);
  }

  function getSection(url) {
    if (/games\.html|ChineseChess/i.test(url)) return 'games';
    if (/novels?\.html|novel-reader/i.test(url)) return 'novels';
    if (/blog\.html/i.test(url)) return 'blog';
    if (/directory\.html/i.test(url)) return 'directory';
    if (/software\.html/i.test(url)) return 'software';
    if (/ai-radar\.html/i.test(url)) return 'radar';
    if (/brand-blacklist/i.test(url)) return 'blacklist';
    return 'tools';
  }

  function sectionLabel(value) {
    return { tools: '工具', games: '游戏', blog: '博客', directory: '黄页', novels: '小说', software: '软件作品', radar: 'AI 雷达', blacklist: '品牌黑名单' }[value] || '首页';
  }

  function navLink(url, value, symbol, label) {
    const active = section === value ? ' is-active' : '';
    const current = active ? ' aria-current="page"' : '';
    return `<a class="phdsx-shell__link${active}" href="${url}" title="${label}" aria-label="${label}"${current}><span class="phdsx-shell__symbol">${symbol}</span><span>${label}</span></a>`;
  }

  function gameLink(url, path, symbol, label) {
    const currentPath = decodeURIComponent(location.pathname).replace(/\\/g, '/').toLowerCase();
    const active = currentPath.endsWith(path.toLowerCase()) ? ' is-active' : '';
    const current = active ? ' aria-current="page"' : '';
    return `<a class="phdsx-shell__link phdsx-shell__link--sub${active}" href="${url}" title="${label}" aria-label="${label}"${current}><span class="phdsx-shell__symbol">${symbol}</span><span>${label}</span></a>`;
  }

  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
  }

  window.dispatchEvent(new Event('resize'));
}());
