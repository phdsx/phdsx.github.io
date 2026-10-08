(function () {
  const databaseUrl = 'database/blacklist.json';

  loadDatabase()
    .then((database) => {
      initList(database);
      initDetail(database);
    })
    .catch((error) => {
      console.error('品牌黑名单数据库读取失败：', error);
      showLoadError();
    });

  async function loadDatabase() {
    const response = await fetch(databaseUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const database = await response.json();
    if (!database || !database.categories || !Array.isArray(database.records)) throw new Error('数据库格式不正确');
    return database;
  }

  function initList(database) {
    const list = document.querySelector('[data-blacklist-list]');
    if (!list) return;

    const records = database.records;
    const categories = database.categories;
    const nameSearch = document.querySelector('[data-blacklist-name]');
    const categorySearch = document.querySelector('[data-blacklist-category]');
    const subcategorySearch = document.querySelector('[data-blacklist-subcategory]');
    const reasonSearch = document.querySelector('[data-blacklist-reason]');
    const countrySearch = document.querySelector('[data-blacklist-country]');
    const sortSearch = document.querySelector('[data-blacklist-sort]');
    const count = document.querySelector('[data-blacklist-count]');
    const empty = document.querySelector('[data-blacklist-empty]');
    const reset = document.querySelector('[data-blacklist-reset]');

    setText('[data-blacklist-total]', records.length);
    setText('[data-blacklist-category-total]', categories.brandCategories.length);
    setText('[data-blacklist-country-total]', new Set(records.map((record) => record.country).filter(Boolean)).size);
    setText('[data-blacklist-updated]', formatUpdated(database.updatedAt));

    const brandCategories = Array.isArray(categories.brandCategories) ? categories.brandCategories : [];
    brandCategories.map((item) => item.name).sort(localeSort).forEach((value) => categorySearch.appendChild(createOption(value)));
    (categories.reasonCategories || []).map((item) => item.name).sort(localeSort).forEach((value) => reasonSearch.appendChild(createOption(value)));
    [...new Set(records.map((record) => record.country).filter(Boolean))].sort(localeSort).forEach((value) => countrySearch.appendChild(createOption(value)));

    function updateSubcategories() {
      const group = brandCategories.find((item) => item.name === categorySearch.value);
      const placeholder = createOption('');
      placeholder.textContent = '全部二级分类';
      subcategorySearch.replaceChildren(placeholder, ...(group?.children || []).slice().sort(localeSort).map(createOption));
      subcategorySearch.disabled = !group;
    }

    function render() {
      const query = nameSearch.value;
      const filtered = records.filter((record) => {
        const searchable = [record.name, record.eventTitle, record.summary, ...(record.aliases || [])].join(' ');
        return fuzzyMatch(searchable, query)
          && (!categorySearch.value || record.category?.primary === categorySearch.value)
          && (!subcategorySearch.value || record.category?.secondary === subcategorySearch.value)
          && (!reasonSearch.value || record.reason?.primary === reasonSearch.value)
          && (!countrySearch.value || record.country === countrySearch.value);
      }).sort(sortSearch.value === 'name'
        ? (a, b) => a.name.localeCompare(b.name, 'zh-CN')
        : (a, b) => b.listedAt.localeCompare(a.listedAt) || a.name.localeCompare(b.name, 'zh-CN'));

      list.innerHTML = filtered.map(recordCard).join('');
      list.setAttribute('aria-busy', 'false');
      count.textContent = `显示 ${filtered.length} / ${records.length} 条记录`;
      empty.hidden = filtered.length > 0;
    }

    nameSearch.addEventListener('input', render);
    categorySearch.addEventListener('change', () => { updateSubcategories(); render(); });
    [subcategorySearch, reasonSearch, countrySearch, sortSearch].forEach((control) => control.addEventListener('change', render));
    reset.addEventListener('click', () => {
      nameSearch.value = '';
      categorySearch.value = '';
      reasonSearch.value = '';
      countrySearch.value = '';
      sortSearch.value = 'latest';
      updateSubcategories();
      render();
      nameSearch.focus();
    });

    updateSubcategories();
    render();
  }

  function recordCard(record) {
    const reason = categoryLabel(record.reason);
    return `<a class="blacklist-record" href="detail.html?id=${encodeURIComponent(record.id)}" aria-label="查看 ${escapeAttribute(record.name)} 的完整档案">
      <div class="blacklist-record-index"><time datetime="${escapeAttribute(record.listedAt)}">${escapeHtml(formatDate(record.listedAt))}</time><span>${escapeHtml(record.country || '未标注')}</span></div>
      <div class="blacklist-record-main">
        <div class="blacklist-record-title"><h2>${escapeHtml(record.name)}</h2>${record.isDemo ? '<span class="blacklist-demo-tag">演示记录</span>' : ''}</div>
        <p>${escapeHtml(record.summary)}</p>
        <div class="blacklist-record-tags"><span>${escapeHtml(categoryLabel(record.category))}</span><span class="is-reason">${escapeHtml(reason)}</span></div>
      </div>
      <div class="blacklist-record-action"><span>打开档案</span><strong aria-hidden="true">↗</strong></div>
    </a>`;
  }

  function initDetail(database) {
    const root = document.querySelector('[data-blacklist-detail]');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
      location.replace('index.html');
      return;
    }
    const record = database.records.find((item) => item.id === id);
    if (!record) return renderNotFound(root);

    document.title = `${record.name} - 品牌黑名单 - PHDSX`;
    const details = (record.details || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
    const timeline = (record.timeline || []).length
      ? (record.timeline || []).map((item) => `<li><time datetime="${escapeAttribute(item.date)}">${escapeHtml(formatDate(item.date))}</time><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></li>`).join('')
      : '<li class="blacklist-timeline-empty"><div><p>暂无时间线信息。</p></div></li>';
    const sources = (record.sources || []).length
      ? `<ol class="blacklist-source-list">${record.sources.map((source, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join('')}</ol>`
      : '<p class="blacklist-source-empty">此记录暂未附外部来源链接。</p>';
    const images = (record.images || []).length
      ? `<section class="blacklist-evidence"><div class="blacklist-section-label"><span>EVIDENCE</span><h2>事件图片</h2></div><div class="blacklist-image-grid">${record.images.map((item) => `<figure><a href="${escapeAttribute(item.src)}" target="_blank" rel="noopener"><img src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.alt)}" loading="lazy"></a>${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`
      : '';
    const aliases = (record.aliases || []).length ? `<p class="blacklist-aliases">别名：${escapeHtml(record.aliases.join('、'))}</p>` : '';

    root.innerHTML = `
      <nav class="blacklist-breadcrumb" aria-label="面包屑"><a href="index.html">品牌黑名单</a><span aria-hidden="true">/</span><span>${escapeHtml(record.name)}</span></nav>
      <header class="blacklist-detail-head">
        <div class="blacklist-detail-title"><div class="blacklist-detail-status"><span>ARCHIVE</span><time datetime="${escapeAttribute(record.listedAt)}">列入于 ${escapeHtml(formatDate(record.listedAt))}</time></div><h1>${escapeHtml(record.name)}</h1>${aliases}<p class="blacklist-detail-summary">${escapeHtml(record.summary)}</p></div>
        <div class="blacklist-detail-stamp"><span>${record.isDemo ? 'DEMO' : 'LISTED'}</span><strong>${escapeHtml(record.reason?.primary || '未分类')}</strong><small>${escapeHtml(record.reason?.secondary || '')}</small></div>
      </header>
      ${record.isDemo ? '<div class="blacklist-demo-banner">此页面为非真实演示记录，不指向任何现实品牌或事件。</div>' : ''}
      <dl class="blacklist-facts">
        <div><dt>品牌分类</dt><dd>${escapeHtml(categoryLabel(record.category))}</dd></div>
        <div><dt>所属国家或地区</dt><dd>${escapeHtml(record.country || '未标注')}</dd></div>
        <div><dt>事件日期</dt><dd>${escapeHtml(formatDate(record.eventDate))}</dd></div>
        <div><dt>原因分类</dt><dd>${escapeHtml(categoryLabel(record.reason))}</dd></div>
      </dl>
      <div class="blacklist-detail-layout">
        <article class="blacklist-event-card">
          <div class="blacklist-section-label"><span>INCIDENT REPORT</span><h2>${escapeHtml(record.eventTitle)}</h2></div>
          <div class="blacklist-event-copy">${details}</div>
          ${images}
          <div class="blacklist-resolution"><span>STATUS / RESOLUTION</span><strong>当前处理结果</strong><p>${escapeHtml(record.resolution || '暂无处理结果')}</p></div>
        </article>
        <aside class="blacklist-detail-side">
          <section><div class="blacklist-section-label"><span>TIMELINE</span><h2>事件时间线</h2></div><ol class="blacklist-timeline">${timeline}</ol></section>
          <section><div class="blacklist-section-label"><span>SOURCES</span><h2>信息来源</h2></div>${sources}</section>
        </aside>
      </div>`;
  }

  function renderNotFound(root) {
    root.innerHTML = '<div class="blacklist-not-found"><span>404</span><h1>没有找到这条品牌记录</h1><p>记录可能已被删除、改名，或链接不完整。</p><a class="button" href="index.html">返回品牌黑名单</a></div>';
    document.title = '记录未找到 - 品牌黑名单 - PHDSX';
  }

  function showLoadError() {
    const error = document.querySelector('[data-blacklist-error]');
    const list = document.querySelector('[data-blacklist-list]');
    const count = document.querySelector('[data-blacklist-count]');
    const detail = document.querySelector('[data-blacklist-detail]');
    if (error) error.hidden = false;
    if (list) list.setAttribute('aria-busy', 'false');
    if (count) count.textContent = '数据库读取失败';
    if (detail) detail.innerHTML = '<div class="blacklist-not-found"><span>!</span><h1>品牌档案暂时无法读取</h1><p>请刷新页面重试。</p><a class="button" href="index.html">返回品牌黑名单</a></div>';
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[\s·•—_\-（）()【】\[\]]+/g, '');
  }

  function fuzzyMatch(value, query) {
    const source = normalize(value);
    const needle = normalize(query);
    if (!needle || source.includes(needle)) return true;
    let position = 0;
    for (const character of source) {
      if (character === needle[position]) position += 1;
      if (position === needle.length) return true;
    }
    return false;
  }

  function formatDate(value) {
    if (!value) return '未标注';
    const parts = value.split('-');
    return parts.length === 3 ? `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日` : value;
  }

  function formatUpdated(value) {
    if (!value) return '未标注';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = String(value);
  }

  function createOption(value) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    return option;
  }

  function categoryLabel(value) {
    if (!value) return '未分类';
    if (typeof value === 'string') return value;
    return [value.primary, value.secondary].filter(Boolean).join(' / ') || '未分类';
  }

  function localeSort(a, b) { return a.localeCompare(b, 'zh-CN'); }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
}());
