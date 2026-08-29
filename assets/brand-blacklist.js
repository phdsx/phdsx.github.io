(function () {
  const records = Array.isArray(window.PHDSX_BRAND_BLACKLIST) ? window.PHDSX_BRAND_BLACKLIST : [];

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

  function createOption(value) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    return option;
  }

  function initList() {
    const list = document.querySelector('[data-blacklist-list]');
    if (!list) return;
    const nameSearch = document.querySelector('[data-blacklist-name]');
    const categorySearch = document.querySelector('[data-blacklist-category]');
    const countrySearch = document.querySelector('[data-blacklist-country]');
    const count = document.querySelector('[data-blacklist-count]');
    const empty = document.querySelector('[data-blacklist-empty]');
    const reset = document.querySelector('[data-blacklist-reset]');
    const total = document.querySelector('[data-blacklist-total]');
    if (total) total.textContent = String(records.length);

    [...new Set(records.map((record) => record.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')).forEach((value) => categorySearch.appendChild(createOption(value)));
    [...new Set(records.map((record) => record.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')).forEach((value) => countrySearch.appendChild(createOption(value)));

    function render() {
      const query = nameSearch.value;
      const category = categorySearch.value;
      const country = countrySearch.value;
      const filtered = records.filter((record) => {
        const names = [record.name, ...(record.aliases || [])].join(' ');
        return fuzzyMatch(names, query)
          && (!category || record.category === category)
          && (!country || record.country === country);
      });
      list.replaceChildren();
      filtered.forEach((record) => {
        const row = document.createElement('tr');
        row.tabIndex = 0;
        row.dataset.blacklistRow = record.id;
        row.setAttribute('aria-label', `查看 ${record.name} 的详细入黑事件`);
        row.innerHTML = `
          <td data-label="品牌名称"><span class="blacklist-brand-name">${escapeHtml(record.name)}</span>${record.isDemo ? '<span class="blacklist-demo-tag">演示</span>' : ''}</td>
          <td data-label="入黑时间"><time datetime="${escapeHtml(record.listedAt)}">${escapeHtml(formatDate(record.listedAt))}</time></td>
          <td data-label="品牌分类">${escapeHtml(record.category || '未分类')}</td>
          <td data-label="所属国家">${escapeHtml(record.country || '未标注')}</td>
          <td data-label="入黑原因类别"><span class="blacklist-reason">${escapeHtml(record.reasonCategory || '未分类')}</span></td>
          <td class="blacklist-open" aria-hidden="true">查看详情 →</td>`;
        const open = () => { location.href = `brand-blacklist-detail.html?id=${encodeURIComponent(record.id)}`; };
        row.addEventListener('click', open);
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
        });
        list.appendChild(row);
      });
      count.textContent = `共 ${filtered.length} 条记录`;
      empty.hidden = filtered.length > 0;
    }

    [nameSearch, categorySearch, countrySearch].forEach((control) => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', render));
    reset.addEventListener('click', () => {
      nameSearch.value = '';
      categorySearch.value = '';
      countrySearch.value = '';
      render();
      nameSearch.focus();
    });
    render();
  }

  function initDetail() {
    const root = document.querySelector('[data-blacklist-detail]');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const record = records.find((item) => item.id === id);
    if (!record) {
      root.innerHTML = '<div class="blacklist-not-found"><span>404</span><h1>没有找到这条品牌记录</h1><p>记录可能已被删除、改名，或链接不完整。</p><a class="button" href="brand-blacklist.html">返回品牌黑名单</a></div>';
      document.title = '记录未找到 - 品牌黑名单 - PHDSX';
      return;
    }
    document.title = `${record.name} - 品牌黑名单 - PHDSX`;
    const details = (record.details || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
    const timeline = (record.timeline || []).map((item) => `
      <li><time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></li>`).join('');
    const sources = (record.sources || []).length
      ? `<ul class="blacklist-source-list">${record.sources.map((source) => `<li><a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join('')}</ul>`
      : '<p class="blacklist-source-empty">此演示记录没有外部来源；正式记录应附可核验来源。</p>';
    root.innerHTML = `
      <nav class="blacklist-breadcrumb" aria-label="面包屑"><a href="brand-blacklist.html">品牌黑名单</a><span aria-hidden="true">/</span><span>${escapeHtml(record.name)}</span></nav>
      <header class="blacklist-detail-head">
        <div><p class="blacklist-kicker">BLACKLIST EVENT</p><h1>${escapeHtml(record.name)}</h1><p>${escapeHtml(record.summary)}</p></div>
        ${record.isDemo ? '<span class="blacklist-demo-banner">非真实演示记录</span>' : ''}
      </header>
      <dl class="blacklist-facts">
        <div><dt>入黑时间</dt><dd>${escapeHtml(formatDate(record.listedAt))}</dd></div>
        <div><dt>品牌分类</dt><dd>${escapeHtml(record.category || '未分类')}</dd></div>
        <div><dt>所属国家</dt><dd>${escapeHtml(record.country || '未标注')}</dd></div>
        <div><dt>原因类别</dt><dd>${escapeHtml(record.reasonCategory || '未分类')}</dd></div>
      </dl>
      <div class="blacklist-detail-layout">
        <article class="blacklist-event-card">
          <span class="tag">详细入黑事件</span>
          <h2>${escapeHtml(record.eventTitle)}</h2>
          <p class="blacklist-event-date">事件日期：${escapeHtml(formatDate(record.eventDate))}</p>
          <div class="blacklist-event-copy">${details}</div>
          <div class="blacklist-resolution"><strong>当前处理结果</strong><p>${escapeHtml(record.resolution || '暂无处理结果')}</p></div>
        </article>
        <aside class="blacklist-detail-side">
          <section><h2>事件时间线</h2><ol class="blacklist-timeline">${timeline || '<li><div><p>暂无时间线信息。</p></div></li>'}</ol></section>
          <section><h2>信息来源</h2>${sources}</section>
        </aside>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  initList();
  initDetail();
}());
