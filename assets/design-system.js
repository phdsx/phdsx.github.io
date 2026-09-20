/* Shared site navigation. URLs are resolved from this script for nested pages. */
(() => {
  const script = document.querySelector('script[src*="assets/design-system.js"]');
  const root = new URL('../', script.src);
  const path = location.pathname.slice(root.pathname.length);
  const game = path.startsWith('games/');
  const tool = path.startsWith('tools/');
  const compact = path.endsWith('ppt-countdown.html');
  document.body.classList.add('unified-page');
  if (tool) document.body.classList.add('unified-tool');
  if (game) document.body.classList.add('unified-game');
  document.body.classList.remove('has-site-sidebar', 'site-nav-open', 'phdsx-nav-open');
  if (compact) {
    document.body.classList.add('unified-presentation');
    return;
  }
  document.querySelector('.phdsx-shell')?.remove();
  document.querySelector('.i18n-floating-toggle')?.remove();
  let header = document.querySelector('.site-header');
  if (!header) {
    header = document.createElement('header');
    document.body.prepend(header);
  }
  header.className = 'unified-header';
  const link = (url, text, active = false) => `<a href="${new URL(url, root).href}"${active ? ' aria-current="page"' : ''}>${text}</a>`;
  const reading = /^(novels\/|blog)/.test(path);
  const exploring = /^(software|directory|ai-radar|brand-blacklist)/.test(path);
  header.innerHTML = `<a class="unified-brand" href="${root.href}index.html" aria-label="返回首页">PHDSX</a>
    <nav class="unified-nav" aria-label="主导航">
      ${link('tools.html', '工具', tool || path === 'tools.html')}
      ${link('games.html', '游戏', game || path === 'games.html')}
      <details${reading ? ' class="is-current"' : ''}><summary>阅读</summary><div class="unified-menu">${link('blog.html', '博客笔记', path.startsWith('blog'))}${link('novels/index.html', '小说连载', path.startsWith('novels/'))}</div></details>
      <details${exploring ? ' class="is-current"' : ''}><summary>探索</summary><div class="unified-menu">${link('software.html', '软件作品', path === 'software.html')}${link('ai-radar.html', 'AI 雷达', path === 'ai-radar.html')}${link('directory.html', '黄页', path === 'directory.html')}${link('brand-blacklist/index.html', '品牌黑名单', path.startsWith('brand-blacklist/'))}</div></details>
    </nav>
    <div class="unified-actions"><a class="unified-search" href="${root.href}index.html#home-search" aria-label="搜索站内内容"><img src="${root.href}assets/porcelain/icons/search.svg" width="20" height="20" alt=""></a><span>让小事更简单</span><button type="button" data-i18n-toggle aria-label="切换语言">EN</button></div>`;
  const menus = [...header.querySelectorAll('details')];
  menus.forEach(menu => menu.addEventListener('toggle', () => {
    if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', event => { if (!header.contains(event.target)) menus.forEach(menu => { menu.open = false; }); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') menus.forEach(menu => {
      if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  });
  if (game) {
    const syncHeaderHeight = () => document.body.style.setProperty('--unified-header-height', `${header.offsetHeight}px`);
    syncHeaderHeight();
    new ResizeObserver(syncHeaderHeight).observe(header);
  }
  window.dispatchEvent(new Event('resize'));
})();
