function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}
function siteText(key, fallback, variables) {
  return window.PHDSXI18n ? window.PHDSXI18n.t(key, fallback, variables) : fallback;
}
function siteTranslate(value, language) {
  return window.PHDSXI18n ? window.PHDSXI18n.translateValue(value, language) : value;
}
function siteOnLanguageChange(listener) {
  return window.PHDSXI18n ? window.PHDSXI18n.onChange(listener) : null;
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
    skip.textContent = siteText('common.skip', '跳到主要内容');
    document.body.insertBefore(skip, header);
  }
  document.body.classList.add('has-site-sidebar');
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  const script = document.currentScript || document.querySelector('script[src*="assets/site.js"]');
  const root = new URL('../', script && script.src ? script.src : location.href).href;
  document.body.classList.add(currentPage === 'index.html' ? 'is-home-page' : 'is-sub-page');
  header.innerHTML = `
    <a class="brand" href="${root}index.html" aria-label="${siteText('common.backHome', '返回首页')}">
      <span class="brand-mark">P</span>
      <span class="brand-copy"><strong>PHDSX</strong><small>PERSONAL HUB</small></span>
    </a>
    <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="${siteText('common.expandNav', '展开站点导航')}"><span></span><span></span><span></span></button>
    <nav class="site-nav" id="site-navigation" aria-label="${siteText('common.mainNav', '主导航')}">
      <div class="nav-section">
        <span class="nav-section-label">${siteText('common.site', '站点')}</span>
        <a class="nav-link" href="${root}index.html"><span class="nav-symbol">⌂</span><span>${siteText('common.home', '首页')}</span></a>
        <a class="nav-link" href="${root}tools.html"><span class="nav-symbol">⌘</span><span>${siteText('common.tools', '工具')}</span></a>
        <a class="nav-link" href="${root}games.html"><span class="nav-symbol">◇</span><span>${siteText('common.games', '游戏')}</span></a>
        <a class="nav-link" href="${root}blog.html"><span class="nav-symbol">▤</span><span>${siteText('common.blog', '博客')}</span></a>
        <a class="nav-link" href="${root}directory.html"><span class="nav-symbol">☷</span><span>${siteText('common.directory', '黄页')}</span></a>
      </div>
      <div class="nav-section">
        <span class="nav-section-label">${siteText('common.reading', '阅读')}</span>
        <a class="nav-link" href="${root}novels/index.html"><span class="nav-symbol">▥</span><span>${siteText('common.novels', '小说')}</span></a>
      </div>
      <div class="nav-section">
        <span class="nav-section-label">${siteText('common.publishing', '发布与记录')}</span>
        <a class="nav-link" href="${root}software.html"><span class="nav-symbol">▣</span><span>${siteText('common.software', '软件作品')}</span></a>
        <a class="nav-link" href="${root}ai-radar.html"><span class="nav-symbol">◎</span><span>${siteText('common.radar', 'AI 雷达')}</span></a>
        <a class="nav-link" href="${root}brand-blacklist/index.html"><span class="nav-symbol">!</span><span>${siteText('common.blacklist', '品牌黑名单')}</span></a>
      </div>
    </nav>
    <button class="site-language-toggle" type="button" data-i18n-toggle>EN</button>
    <div class="sidebar-meta"><span>PHDSX · 2026</span><small>${siteText('common.keepUpdating', '持续整理与更新')}</small></div>
  `;

  const toggle = header.querySelector('.site-nav-toggle');
  const closeNavigation = (restoreFocus) => {
    header.classList.remove('is-open');
    document.body.classList.remove('site-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', siteText('common.expandNav', '展开站点导航'));
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    document.body.classList.toggle('site-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? siteText('common.collapseNav', '收起站点导航') : siteText('common.expandNav', '展开站点导航'));
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
  const detailSections = { 'blog-post.html': 'blog.html', 'reader.html': 'index.html', 'detail.html': 'index.html' };
  const currentPath = decodeURIComponent(location.pathname).replace(/\\/g, '/');
  const isGamePage = current === 'games.html' || /\/games\//i.test(currentPath);
  document.querySelectorAll('.site-nav .nav-link').forEach((link) => {
    const label = link.querySelector(':scope > span:last-child')?.textContent.trim() || link.textContent.trim();
    if (label) {
      link.dataset.label = label;
      link.title = label;
      link.setAttribute('aria-label', label);
    }
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    const isGameIndex = target === 'games.html' && isGamePage;
    const inNovelSection = /\/novels\/(?:index|reader)\.html$/i.test(currentPath) && /\/novels\//i.test(link.href);
    const inBlacklistSection = /\/brand-blacklist\/(?:index|detail)\.html$/i.test(currentPath) && /\/brand-blacklist\//i.test(link.href);
    const active = target === current || isGameIndex || detailSections[current] === target || inNovelSection || inBlacklistSection;
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
    document.querySelectorAll('[data-catalog-group]').forEach((group) => {
      group.hidden = ![...group.querySelectorAll(cardSelector)].some((card) => !card.hidden);
    });
    empty.hidden = !query || visibleCount > 0;
    empty.textContent = query && visibleCount === 0 ? siteText('search.noMatch', '没有找到与“{query}”匹配的内容。', { query: input.value.trim() }) : '';
  };
  input.addEventListener('input', apply);
  apply();
  siteOnLanguageChange(apply);
}
function initToolTabs() {
  const container = document.querySelector('[data-tool-tabs]');
  if (!container) return;
  const tabs = [...container.querySelectorAll('[data-tool-tab]')];
  const panels = [...container.querySelectorAll('[data-tool-panel]')];
  const status = container.querySelector('[data-tool-tab-status]');
  const itemName = container.dataset.catalogItemName || '工具';
  if (!tabs.length || !panels.length) return;

  const activate = (tab) => {
    const category = tab.dataset.toolTab;
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.toolPanel !== category;
    });
    const panel = panels.find((item) => item.dataset.toolPanel === category);
    const heading = panel?.querySelector('h2')?.textContent.trim() || '当前';
    const count = panel?.querySelectorAll('.link-card').length || 0;
    if (status) status.textContent = siteText('catalog.showing', '正在显示{heading}分类，共 {count} {unit}。', { heading: siteTranslate(heading), count, unit: itemName === '游戏' ? siteText('catalog.gameItem', '款游戏') : siteText('catalog.toolUnit', '项工具') });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[nextIndex].focus();
      activate(tabs[nextIndex]);
    });
  });

  activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  siteOnLanguageChange(() => activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]));
}
function initToolSubtabs() {
  document.querySelectorAll('[data-tool-subtabs]').forEach((container) => {
    const tabs = [...container.querySelectorAll('[data-tool-subtab]')];
    const panels = [...container.querySelectorAll('[data-tool-subpanel]')];
    const status = container.querySelector('[data-tool-subtab-status]');
    const itemName = container.dataset.catalogItemName || '工具';
    if (!tabs.length || !panels.length) return;

    const activate = (tab) => {
      const subcategory = tab.dataset.toolSubtab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.toolSubpanel !== subcategory;
      });
      const panel = panels.find((item) => item.dataset.toolSubpanel === subcategory);
      const label = tab.querySelector(':scope > span:first-child')?.textContent.trim() || '当前';
      const count = panel?.querySelectorAll('.link-card').length || 0;
      if (status) status.textContent = siteText('catalog.subShowing', '正在显示{label}子分类，共 {count} {unit}。', { label: siteTranslate(label), count, unit: itemName === '游戏' ? siteText('catalog.gameItem', '款游戏') : siteText('catalog.toolUnit', '项工具') });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[nextIndex].focus();
        activate(tabs[nextIndex]);
      });
    });

    activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
    siteOnLanguageChange(() => activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]));
  });
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
      item.keywords = normalizeText(`${item.label} ${siteTranslate(item.label, 'zh')} ${siteTranslate(item.label, 'en')} ${item.keywords || ''} ${item.href}`);
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
        const scope = activeCategory === '全部' ? siteText('search.allCategories', '全部分类') : siteTranslate(activeCategory);
        status.textContent = matches.length ? `${scope} · ${siteText('search.found', '找到 {count} 个相关入口', { count: matches.length })}` : `${scope} · ${siteText('search.noResult', '没有找到相关入口')}`;
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
        input.placeholder = activeCategory === '全部' ? siteText('search.allPlaceholder', '搜索全部内容') : siteText('search.categoryPlaceholder', '搜索{category}', { category: siteTranslate(activeCategory) });
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
        input.placeholder = siteText('search.allPlaceholder', '搜索全部内容');
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
    siteOnLanguageChange(() => {
      input.placeholder = activeCategory === '全部' ? siteText('search.allPlaceholder', '搜索全部内容') : siteText('search.categoryPlaceholder', '搜索{category}', { category: siteTranslate(activeCategory) });
      render();
    });
  }

  const clock = document.querySelector('[data-home-clock]');
  const date = document.querySelector('[data-home-date]');
  if (clock && date) {
    const update = () => {
      const now = new Date();
      const locale = window.PHDSXI18n ? window.PHDSXI18n.getLocale() : 'zh-CN';
      clock.textContent = now.toLocaleTimeString(locale, { hour12: false });
      date.textContent = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
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
  if (/games/i.test(href)) return '游戏';
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
    empty.textContent = visibleCount ? '' : siteText('blog.noMatch', '没有找到符合当前筛选条件的文章。');
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
  siteOnLanguageChange(apply);
}
function initNovelProgress() {
  const update = (link) => {
    const novelId = link.dataset.novelId;
    let storedProgress = '1';
    try { storedProgress = localStorage.getItem(`phdsx-novel-progress-${novelId}`) || '1'; } catch (error) { /* Storage can be unavailable in privacy modes. */ }
    const progress = Number.parseInt(storedProgress, 10);
    const chapter = Number.isFinite(progress) && progress > 0 ? progress : 1;
    link.href = `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapter}`;
    link.textContent = chapter > 1 ? siteText('novel.continueReading', '继续阅读第 {chapter} 章', { chapter }) : siteText('novel.startReading', '开始阅读');
  };
  const updateAll = () => document.querySelectorAll('[data-novel-continue]').forEach(update);
  updateAll();
  siteOnLanguageChange(updateAll);
}
function initLicenseLinks() {
  document.querySelectorAll('.site-footer').forEach((footer) => {
    if (footer.querySelector('[data-site-license]')) return;
    const licenseLink = document.createElement('a');
    licenseLink.href = '/LICENSE';
    licenseLink.dataset.siteLicense = '';
    licenseLink.textContent = 'AGPL-3.0-or-later';
    licenseLink.setAttribute('aria-label', siteText('common.viewLicense', '查看 AGPL-3.0-or-later 许可证'));
    const sourceLink = document.createElement('a');
    sourceLink.href = 'https://github.com/phdsx/phdsx.github.io';
    sourceLink.textContent = siteText('common.sourceCode', '获取源代码');
    sourceLink.setAttribute('aria-label', siteText('common.sourceCode', '获取源代码'));
    footer.append(licenseLink, sourceLink);
  });
}
initSiteSidebar();
initSiteNavigation();
initHomeWorkspace();
initHomeStats();
initCardSearch('[data-tool-search]', '[data-keywords]');
initToolTabs();
initToolSubtabs();
initBlogFilters();
initNovelProgress();
initLicenseLinks();
