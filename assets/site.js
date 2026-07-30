function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}
const SITE_SEARCH_CATALOG = [
  ['二维码生成', 'Tools/qr-generator.html', '工具', '二维码 QR Code 文字 网址 文件 本地生成'],
  ['PPT 放映悬浮倒计时', 'Tools/ppt-countdown.html', '工具', 'PPT 演示 放映 悬浮 倒计时 时间'],
  ['下班倒计时', 'ChouXiangTool/下班倒计时.html', '工具', '下班 工作 时间 倒计时'],
  ['日期倒计时', 'ChouXiangTool/倒计时.html', '工具', '考试 纪念日 时间 日期 倒计时'],
  ['吃啥饭', 'ChouXiangTool/吃啥饭.html', '工具', '吃饭 菜单 随机 选择 生活'],
  ['父母性别计算器', 'ChouXiangTool/父母性别计算器.html', '工具', '父母 性别 计算器 趣味'],
  ['雷劈计算器', 'ChouXiangTool/雷劈计算器.html', '工具', '雷 雷劈 计算器 趣味 娱乐'],
  ['图片压缩', 'PictureTools/pic_compress.html', '工具', '图片 照片 压缩 体积'],
  ['图片裁剪', 'PictureTools/pic_cut.html', '工具', '图片 照片 裁剪 比例'],
  ['图片缩放', 'PictureTools/pic_scale_change.html', '工具', '图片 照片 缩放 尺寸 比例'],
  ['图片水印', 'PictureTools/pic_watermark.html', '工具', '图片 照片 水印 桌面'],
  ['移动端水印', 'PictureTools/pic_watermark_mob.html', '工具', '图片 照片 水印 手机'],
  ['大小写转换', 'TextTool/case-converter.html', '工具', '英文 字母 大写 小写 文本 转换'],
  ['文本去重', 'TextTool/TextDropDup.html', '工具', '文字 文本 去重 重复行 清理'],
  ['字数统计', 'TextTool/WordCount.html', '工具', '文字 文本 字数 字符 段落 统计'],
  ['文本美化', 'TextTool/WordPretty.html', '工具', '文字 文本 美化 排版 格式'],
  ['VIP 视频解析', 'JS/vipvideo.html', '工具', 'VIP 视频 媒体 解析 播放'],
  ['中国象棋', 'ChineseChess.html', '游戏', '中国 象棋 棋牌游戏 双人'],
  ['俄罗斯方块', 'Games/tetris.html', '游戏', '俄罗斯 方块 消除 经典'],
  ['水果忍者', 'Games/dinnerninja/index.html', '游戏', '水果 忍者 切水果 休闲'],
  ['潜艇大战', 'Games/submarine-battle.html', '游戏', '潜艇 大战 深海 射击'],
  ['零号回声', 'novels.html', '小说', '小说 连载 零号回声 科幻 悬疑 阅读'],
  ['Python 教程笔记', 'blog-post.html?src=Python%2FPython_tutorail.md&title=Python%20%E6%95%99%E7%A8%8B%E7%AC%94%E8%AE%B0&topic=Python&date=2020-05-22', '博客', 'Python 教程 学习 笔记'],
  ['Python 输出笔记', 'blog-post.html?src=Python%2FPython_output.md&title=Python%20%E8%BE%93%E5%87%BA%E7%AC%94%E8%AE%B0&topic=Python&date=2020-05-22', '博客', 'Python 输出 学习 笔记'],
  ['站点更新记录', 'blog-post.html?src=index.md&title=%E7%AB%99%E7%82%B9%E6%9B%B4%E6%96%B0%E8%AE%B0%E5%BD%95&topic=%E7%AB%99%E7%82%B9&date=2020-05-22', '博客', '站点 网站 更新 记录'],
  ['常用电话黄页', 'directory.html', '黄页', '电话 黄页 联系方式 中国移动 客服']
].map(([label, href, type, keywords]) => ({ label, href, type, keywords }));
function initSiteSidebar() {
  const header = document.querySelector('.site-header');
  if (!header) return;
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
      </div>` : '';
  document.body.classList.add(currentPage === 'index.html' ? 'is-home-page' : 'is-sub-page');
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="返回首页">
      <span class="brand-mark">P</span>
      <span class="brand-copy"><strong>PHDSX</strong><small>PERSONAL HUB</small></span>
    </a>
    <nav class="site-nav" aria-label="主导航">
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
        <a class="nav-link" href="novels.html"><span class="nav-symbol">▥</span><span>小说连载</span></a>
      </div>
      ${gameNavigation}
    </nav>
    <div class="sidebar-meta"><span>PHDSX · 2026</span><small>持续整理与更新</small></div>
  `;
}
function initSiteNavigation() {
  const current = location.pathname.split('/').pop() || 'index.html';
  const blogPages = ['blog-post.html'];
  const currentPath = decodeURIComponent(location.pathname).replace(/\\/g, '/');
  const isGamePage = current === 'ChineseChess.html'
    || /\/Games\/(?:tetris|submarine-battle)\.html$/i.test(currentPath)
    || /\/Games\/dinnerninja\/index\.html$/i.test(currentPath);
  document.querySelectorAll('.site-nav .nav-link').forEach((link) => {
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    const isGameIndex = target === 'games.html' && isGamePage;
    const active = target === current || isGameIndex || (blogPages.includes(current) && target === 'blog.html');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function initCardSearch(inputSelector, cardSelector) {
  const input = document.querySelector(inputSelector);
  if (!input) return;
  const cards = [...document.querySelectorAll(cardSelector)];
  const apply = () => {
    const query = normalizeText(input.value);
    cards.forEach((card) => {
      const keywords = normalizeText(card.dataset.keywords || card.textContent);
      card.hidden = Boolean(query && !keywords.includes(query));
    });
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
    const indexedCatalog = Array.isArray(window.PHDSX_SEARCH_INDEX) && window.PHDSX_SEARCH_INDEX.length
      ? window.PHDSX_SEARCH_INDEX
      : SITE_SEARCH_CATALOG;
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
        link.dataset.searchResult = String(index);
        link.setAttribute('role', 'option');
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
      results.forEach((item, index) => item.classList.toggle('is-active', index === activeIndex));
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
      }
    });
    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.searchCategory || '全部';
        categoryButtons.forEach((item) => item.classList.toggle('active', item === button));
        input.placeholder = activeCategory === '全部' ? '搜索全部内容' : `搜索${activeCategory}`;
        render();
        input.focus();
      });
    });
    suggestions.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = '全部';
        categoryButtons.forEach((item) => item.classList.toggle('active', item.dataset.searchCategory === '全部'));
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
      }
    });
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
      }
    });
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
function getSearchType(href) {
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
  let topic = '全部';
  const apply = () => {
    const query = normalizeText(search && search.value);
    const cards = [...list.querySelectorAll('[data-blog-card]')];
    cards.forEach((card) => {
      const matchTopic = topic === '全部' || card.dataset.topic === topic;
      const matchQuery = !query || normalizeText(card.dataset.keywords).includes(query);
      card.hidden = !(matchTopic && matchQuery);
    });
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
    chips.forEach((item) => item.classList.toggle('active', item === chip));
    apply();
  }));
  if (search) search.addEventListener('input', apply);
  if (sort) sort.addEventListener('change', apply);
  apply();
}
function initNovelProgress() {
  document.querySelectorAll('[data-novel-continue]').forEach((link) => {
    const novelId = link.dataset.novelId;
    const progress = Number.parseInt(localStorage.getItem(`phdsx-novel-progress-${novelId}`) || '1', 10);
    const chapter = Number.isFinite(progress) && progress > 0 ? progress : 1;
    link.href = `novel-reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapter}`;
    link.textContent = chapter > 1 ? `继续阅读第 ${chapter} 章` : '开始阅读';
  });
}
initSiteSidebar();
initSiteNavigation();
initHomeWorkspace();
initCardSearch('[data-tool-search]', '[data-keywords]');
initBlogFilters();
initNovelProgress();
