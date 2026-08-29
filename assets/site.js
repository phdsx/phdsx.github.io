function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}
function getSiteCatalog() {
  return Array.isArray(window.PHDSX_SEARCH_INDEX) ? window.PHDSX_SEARCH_INDEX : [];
}
function initSiteSidebar() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';
  if (main && !document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = '跳到主要内容';
    document.body.insertBefore(skip, header);
  }
  document.body.classList.add('has-site-sidebar');
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  const gamePages = ['games.html', 'ChineseChess.html'];
  const gameNavigation = gamePages.includes(currentPage) ? `
      <div class="nav-section nav-section--secondary">
        <span class="nav-section-label">游戏分类</span>
        <a class="nav-link nav-link--sub" href="ChineseChess.html"><span class="nav-symbol">将</span><span>中国象棋</span></a>
        <a class="nav-link nav-link--sub" href="Games/tetris.html"><span class="nav-symbol">田</span><span>俄罗斯方块</span></a>
        <a class="nav-link nav-link--sub" href="Games/dinnerninja/index.html"><span class="nav-symbol">切</span><span>水果忍者</span></a>
        <a class="nav-link nav-link--sub" href="Games/submarine-battle.html"><span class="nav-symbol">潜</span><span>潜艇大战</span></a>
        <a class="nav-link nav-link--sub" href="Games/parking-pulse.html"><span class="nav-symbol">泊</span><span>Parking Pulse</span></a>
        <a class="nav-link nav-link--sub" href="Games/sand-sort.html"><span class="nav-symbol">沙</span><span>沙子分类</span></a>
      </div>` : '';
  document.body.classList.add(currentPage === 'index.html' ? 'is-home-page' : 'is-sub-page');
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="返回首页">
      <span class="brand-mark">P</span>
      <span class="brand-copy"><strong>PHDSX</strong><small>PERSONAL HUB</small></span>
    </a>
    <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="展开站点导航"><span></span><span></span><span></span></button>
    <nav class="site-nav" id="site-navigation" aria-label="主导航">
      <div class="nav-section">
        <span class="nav-section-label">站点</span>
        <a class="nav-link" href="index.html"><span class="nav-symbol">⌂</span><span>首页</span></a>
        <a class="nav-link" href="tools.html"><span class="nav-symbol">⌘</span><span>工具</span></a>
        <a class="nav-link" href="games.html"><span class="nav-symbol">◇</span><span>游戏</span></a>
        <a class="nav-link" href="blog.html"><span class="nav-symbol">▤</span><span>博客</span></a>
        <a class="nav-link" href="directory.html"><span class="nav-symbol">☷</span><span>黄页</span></a>
      </div>
      <div class="nav-section">
        <span class="nav-section-label">阅读</span>
        <a class="nav-link" href="novels.html"><span class="nav-symbol">▥</span><span>小说</span></a>
      </div>
      <div class="nav-section">
        <span class="nav-section-label">发布与记录</span>
        <a class="nav-link" href="software.html"><span class="nav-symbol">▣</span><span>软件作品</span></a>
        <a class="nav-link" href="ai-radar.html"><span class="nav-symbol">◎</span><span>AI 雷达</span></a>
        <a class="nav-link" href="brand-blacklist.html"><span class="nav-symbol">!</span><span>品牌黑名单</span></a>
      </div>
      ${gameNavigation}
    </nav>
    <div class="sidebar-meta"><span>PHDSX · 2026</span><small>持续整理与更新</small></div>
  `;

  const toggle = header.querySelector('.site-nav-toggle');
  const closeNavigation = (restoreFocus) => {
    header.classList.remove('is-open');
    document.body.classList.remove('site-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '展开站点导航');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    document.body.classList.toggle('site-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起站点导航' : '展开站点导航');
  });
  header.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => closeNavigation(false)));
  document.addEventListener('click', (event) => {
    if (header.classList.contains('is-open') && !header.contains(event.target)) closeNavigation(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) closeNavigation(true);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches) closeNavigation(false);
  });
}
function initSiteNavigation() {
  const current = location.pathname.split('/').pop() || 'index.html';
  const detailSections = { 'blog-post.html': 'blog.html', 'novel-reader.html': 'novels.html', 'brand-blacklist-detail.html': 'brand-blacklist.html' };
  const currentPath = decodeURIComponent(location.pathname).replace(/\\/g, '/');
  const isGamePage = current === 'ChineseChess.html'
    || /\/Games\/(?:tetris|submarine-battle|parking-pulse|sand-sort)\.html$/i.test(currentPath)
    || /\/Games\/dinnerninja\/index\.html$/i.test(currentPath);
  document.querySelectorAll('.site-nav .nav-link').forEach((link) => {
    const label = link.querySelector(':scope > span:last-child')?.textContent.trim() || link.textContent.trim();
    if (label) {
      link.dataset.label = label;
      link.title = label;
      link.setAttribute('aria-label', label);
    }
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    const isGameIndex = target === 'games.html' && isGamePage;
    const active = target === current || isGameIndex || detailSections[current] === target;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function initCardSearch(inputSelector, cardSelector) {
  const input = document.querySelector(inputSelector);
  if (!input) return;
  const cards = [...document.querySelectorAll(cardSelector)];
  const grid = cards[0] && cards[0].parentElement;
  const empty = document.createElement('p');
  empty.className = 'filter-empty';
  empty.hidden = true;
  empty.setAttribute('role', 'status');
  if (grid) grid.before(empty);
  const apply = () => {
    const query = normalizeText(input.value);
    let visibleCount = 0;
    cards.forEach((card) => {
      const keywords = normalizeText(card.dataset.keywords || card.textContent);
      card.hidden = Boolean(query && !keywords.includes(query));
      if (!card.hidden) visibleCount += 1;
    });
    empty.hidden = !query || visibleCount > 0;
    empty.textContent = query && visibleCount === 0 ? `没有找到与“${input.value.trim()}”匹配的内容。` : '';
  };
  input.addEventListener('input', apply);
  apply();
}
function initHomeWorkspace() {
  const input = document.querySelector('[data-home-search]');
  const panel = document.querySelector('[data-home-search-panel]');
  const resultList = document.querySelector('[data-home-search-list]');
  const status = document.querySelector('[data-home-search-status]');
  if (input && panel && resultList) {
    const categoryButtons = [...document.querySelectorAll('[data-search-category]')];
    const suggestions = [...document.querySelectorAll('[data-search-suggestion]')];
    const submit = document.querySelector('[data-search-submit]');
    const seen = new Set();
    const indexedCatalog = getSiteCatalog();
    const pageCatalog = [...document.querySelectorAll('main a[href]')].filter((link) => {
      const href = link.getAttribute('href');
      return Boolean(href && !href.startsWith('#'));
    }).map((link) => ({
      href: link.getAttribute('href'),
      label: getSearchLabel(link),
      keywords: normalizeText((link.dataset.keywords || '') + ' ' + link.textContent + ' ' + link.getAttribute('href')),
      type: getSearchType(link.getAttribute('href'))
    }));
    const catalog = [...indexedCatalog, ...pageCatalog].filter((item) => {
      if (!item.href || seen.has(item.href)) return false;
      seen.add(item.href);
      item.keywords = normalizeText(`${item.label} ${item.keywords || ''} ${item.href}`);
      return true;
    });
    let activeIndex = -1;
    let activeCategory = '全部';

    const render = () => {
      const query = normalizeText(input.value);
      resultList.replaceChildren();
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      if (!query && activeCategory === '全部') {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        return;
      }

      const matches = catalog.filter((item) => {
        const matchesCategory = activeCategory === '全部' || item.type === activeCategory;
        const matchesQuery = !query || item.keywords.includes(query);
        return matchesCategory && matchesQuery;
      }).slice(0, 8);
      matches.forEach((item, index) => {
        const link = document.createElement('a');
        const label = document.createElement('span');
        const type = document.createElement('small');
        link.href = item.href;
        link.id = `home-search-option-${index}`;
        link.dataset.searchResult = String(index);
        link.setAttribute('role', 'option');
        link.setAttribute('aria-selected', 'false');
        label.textContent = item.label;
        type.textContent = item.type;
        link.append(label, type);
        resultList.appendChild(link);
      });
      if (status) {
        const scope = activeCategory === '全部' ? '全部分类' : activeCategory;
        status.textContent = matches.length ? `${scope} · 找到 ${matches.length} 个相关入口` : `${scope} · 没有找到相关入口`;
      }
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    const moveActive = (direction) => {
      const results = [...resultList.querySelectorAll('[data-search-result]')];
      if (!results.length) return;
      activeIndex = (activeIndex + direction + results.length) % results.length;
      results.forEach((item, index) => {
        const active = index === activeIndex;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      input.setAttribute('aria-activedescendant', results[activeIndex].id);
      results[activeIndex].scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => {
      if (input.value || activeCategory !== '全部') render();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        resultList.querySelector(`[data-search-result="${activeIndex}"]`)?.click();
      } else if (event.key === 'Escape') {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      }
    });
    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.searchCategory || '全部';
        categoryButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        input.placeholder = activeCategory === '全部' ? '搜索全部内容' : `搜索${activeCategory}`;
        render();
        input.focus();
      });
    });
    suggestions.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = '全部';
        categoryButtons.forEach((item) => {
          const active = item.dataset.searchCategory === '全部';
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        input.placeholder = '搜索全部内容';
        input.value = button.dataset.searchSuggestion || button.textContent;
        render();
        input.focus();
      });
    });
    if (submit) {
      submit.addEventListener('click', () => {
        render();
        resultList.querySelector('[data-search-result="0"]')?.focus();
      });
    }
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.portal-search')) {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      }
    });
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
      }
    });
    categoryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
  }

  const clock = document.querySelector('[data-home-clock]');
  const date = document.querySelector('[data-home-date]');
  if (clock && date) {
    const update = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
      date.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    };
    update();
    setInterval(update, 1000);
  }
}
function initHomeStats() {
  const catalog = getSiteCatalog();
  document.querySelectorAll('[data-site-count]').forEach((element) => {
    const type = element.dataset.siteCount;
    const count = type === '阅读'
      ? catalog.filter((item) => item.type === '博客' || item.type === '小说').length
      : catalog.filter((item) => item.type === type).length;
    element.textContent = String(count);
  });
  document.querySelectorAll('[data-catalog-total]').forEach((element) => {
    const count = catalog.filter((item) => item.type === element.dataset.catalogTotal).length;
    element.textContent = String(count);
  });
}
function getSearchType(href) {
  if (/ai-radar/i.test(href)) return '雷达';
  if (/brand-blacklist/i.test(href)) return '黑名单';
  if (/software\.html/i.test(href)) return '软件';
  if (/novel/i.test(href)) return '小说';
  if (/blog|Python/i.test(href)) return '博客';
  if (/games|ChineseChess/i.test(href)) return '游戏';
  if (/directory|^tel:/i.test(href)) return '黄页';
  return '工具';
}
function getSearchLabel(link) {
  if (link.dataset.searchLabel) return link.dataset.searchLabel;
  if (link.classList.contains('app-item')) return link.lastElementChild?.textContent.trim() || link.textContent.trim();
  if (link.classList.contains('game-tile') || link.closest('.quick-list')) {
    return link.querySelector('strong')?.textContent.trim() || link.textContent.trim();
  }
  const directSpan = [...link.children].find((element) => element.tagName === 'SPAN');
  return (directSpan?.textContent || link.querySelector('strong')?.textContent || link.textContent).trim().replace(/\s+/g, ' ');
}
function initBlogFilters() {
  const list = document.querySelector('[data-blog-list]');
  if (!list) return;
  const search = document.querySelector('[data-blog-search]');
  const sort = document.querySelector('[data-blog-sort]');
  const chips = [...document.querySelectorAll('[data-blog-topic]')];
  const empty = document.createElement('p');
  empty.className = 'filter-empty';
  empty.hidden = true;
  empty.setAttribute('role', 'status');
  list.before(empty);
  let topic = '全部';
  const apply = () => {
    const query = normalizeText(search && search.value);
    const cards = [...list.querySelectorAll('[data-blog-card]')];
    cards.forEach((card) => {
      const matchTopic = topic === '全部' || card.dataset.topic === topic;
      const matchQuery = !query || normalizeText(card.dataset.keywords).includes(query);
      card.hidden = !(matchTopic && matchQuery);
    });
    const visibleCount = cards.filter((card) => !card.hidden).length;
    empty.hidden = visibleCount > 0;
    empty.textContent = visibleCount ? '' : '没有找到符合当前筛选条件的文章。';
    const sorted = cards.sort((a, b) => {
      const mode = sort ? sort.value : 'date-desc';
      if (mode === 'date-asc') return a.dataset.date.localeCompare(b.dataset.date);
      if (mode === 'title-asc') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent, 'zh-CN');
      return b.dataset.date.localeCompare(a.dataset.date);
    });
    sorted.forEach((card) => list.appendChild(card));
  };
  chips.forEach((chip) => chip.addEventListener('click', () => {
    topic = chip.dataset.blogTopic;
    chips.forEach((item) => {
      const active = item === chip;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    apply();
  }));
  if (search) search.addEventListener('input', apply);
  if (sort) sort.addEventListener('change', apply);
  chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.classList.contains('active'))));
  apply();
}
function initNovelProgress() {
  document.querySelectorAll('[data-novel-continue]').forEach((link) => {
    const novelId = link.dataset.novelId;
    let storedProgress = '1';
    try { storedProgress = localStorage.getItem(`phdsx-novel-progress-${novelId}`) || '1'; } catch (error) { /* Storage can be unavailable in privacy modes. */ }
    const progress = Number.parseInt(storedProgress, 10);
    const chapter = Number.isFinite(progress) && progress > 0 ? progress : 1;
    link.href = `novel-reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapter}`;
    link.textContent = chapter > 1 ? `继续阅读第 ${chapter} 章` : '开始阅读';
  });
}
initSiteSidebar();
initSiteNavigation();
initHomeWorkspace();
initHomeStats();
initCardSearch('[data-tool-search]', '[data-keywords]');
initBlogFilters();
initNovelProgress();
