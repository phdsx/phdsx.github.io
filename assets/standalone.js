(function () {
  if (document.querySelector('.phdsx-shell')) return;

  const script = document.currentScript;
  const home = script && script.dataset.home ? script.dataset.home : 'index.html';
  const returnUrl = script && script.dataset.return ? script.dataset.return : home;
  const root = home.replace(/index\.html(?:[?#].*)?$/i, '');
  const title = document.title.replace(/\s*-\s*PHDSX\s*$/i, '') || '功能页面';
  const section = getSection(returnUrl);
  const immersive = section === 'games' || /ppt-countdown\.html$/i.test(location.pathname);

  document.documentElement.classList.add('phdsx-themed');
  document.body.classList.add('phdsx-has-shell');
  if (immersive) document.body.classList.add('phdsx-immersive');

  const shell = document.createElement('header');
  shell.className = 'phdsx-shell' + (immersive ? ' phdsx-shell--compact' : '');
  shell.innerHTML =
    '<div class="phdsx-shell__bar">' +
      '<a class="phdsx-shell__brand" href="' + home + '" aria-label="返回 PHDSX 首页">' +
        '<span class="phdsx-shell__mark">P</span><span>PHDSX</span>' +
      '</a>' +
      '<div class="phdsx-shell__current"><span>' + sectionLabel(section) + '</span><strong>' + escapeHtml(title) + '</strong></div>' +
      (immersive ? '<button class="phdsx-shell__toggle" type="button" aria-expanded="false" aria-label="展开站点导航"><span></span><span></span><span></span></button>' : '') +
      '<nav class="phdsx-shell__nav" aria-label="主导航">' +
        navLink(root + 'index.html', 'home', '首页') +
        navLink(root + 'tools.html', 'tools', '工具') +
        navLink(root + 'games.html', 'games', '游戏') +
        navLink(root + 'blog.html', 'blog', '博客') +
        navLink(root + 'directory.html', 'directory', '黄页') +
      '</nav>' +
      '<a class="phdsx-shell__back" href="' + returnUrl + '">返回' + sectionLabel(section) + '</a>' +
    '</div>';

  document.body.prepend(shell);

  const toggle = shell.querySelector('.phdsx-shell__toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      const open = shell.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '收起站点导航' : '展开站点导航');
    });
  }

  if (!immersive) {
    const footer = document.createElement('footer');
    footer.className = 'phdsx-page-footer';
    footer.innerHTML = '<span>PHDSX 个人主页</span><a href="' + returnUrl + '">返回' + sectionLabel(section) + '</a>';
    document.body.appendChild(footer);
  }

  function getSection(url) {
    if (/games\.html/i.test(url)) return 'games';
    if (/blog\.html/i.test(url)) return 'blog';
    if (/directory\.html/i.test(url)) return 'directory';
    return 'tools';
  }

  function sectionLabel(value) {
    return { tools: '工具', games: '游戏', blog: '博客', directory: '黄页' }[value] || '首页';
  }

  function navLink(url, value, label) {
    const active = section === value ? ' is-active' : '';
    const current = active ? ' aria-current="page"' : '';
    return '<a class="phdsx-shell__link' + active + '" href="' + url + '"' + current + '>' + label + '</a>';
  }

  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
  }
}());
