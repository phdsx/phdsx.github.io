(() => {
  let database = null;
  let assets = [];
  let originalId = '';
  let draftImages = [];
  let idTouched = false;
  let noticeTimer = null;

  const byId = (id) => document.getElementById(id);
  const form = byId('recordForm');
  const fields = form.elements;
  const recordList = byId('recordList');
  const notice = byId('notice');
  const saveState = byId('saveState');
  const databaseTime = byId('databaseTime');
  const recordImages = byId('recordImages');
  const assetPicker = byId('assetPicker');
  const categoryElements = {
    brand: { key: 'brandCategories', recordKey: 'category', root: byId('brandCategories'), count: byId('brandCategoryCount') },
    reason: { key: 'reasonCategories', recordKey: 'reason', root: byId('reasonCategories'), count: byId('reasonCategoryCount') }
  };

  bindEvents();
  loadState().catch((error) => announce(`无法连接本地数据库：${error.message}`, true));

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    byId('recordSearch').addEventListener('input', renderRecordList);
    byId('newRecord').addEventListener('click', startNewRecord);
    recordList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-record-id]');
      if (button) editRecord(button.dataset.recordId);
    });
    fields.name.addEventListener('input', () => {
      if (!originalId && !idTouched) fields.id.value = createId(fields.name.value);
      byId('editorTitle').textContent = fields.name.value.trim() || '新建品牌记录';
    });
    fields.id.addEventListener('input', () => { idTouched = true; });
    byId('categoryPrimary').addEventListener('change', () => populateSecondary('brand'));
    byId('reasonPrimary').addEventListener('change', () => populateSecondary('reason'));
    form.addEventListener('submit', saveRecord);
    byId('deleteRecord').addEventListener('click', deleteCurrentRecord);

    byId('recordImageUpload').addEventListener('change', async (event) => {
      const files = [...event.target.files];
      event.target.value = '';
      await uploadFiles(files, true);
    });
    byId('fetchRecordImage').addEventListener('click', async () => {
      const input = byId('recordImageUrl');
      const url = input.value.trim();
      if (!url) return announce('请先输入网络图片地址。', true);
      try {
        setBusy('正在拉取网络图片并保存到 assert…');
        const saved = await api('/api/assets/fetch', { method: 'POST', body: { url, prefix: fields.id.value || 'evidence' } });
        draftImages.push({ src: saved.src, alt: `${fields.name.value.trim() || '事件'}相关图片`, caption: '' });
        input.value = '';
        await refreshState();
        renderRecordImages();
        announce(`图片已保存为 ${saved.name}`);
      } catch (error) { announce(`图片拉取失败：${error.message}`, true); }
    });
    byId('attachAsset').addEventListener('click', () => {
      const src = assetPicker.value;
      if (!src) return announce('请先选择一张本地图片。', true);
      if (draftImages.some((item) => item.src === src)) return announce('当前记录已经加入这张图片。', true);
      draftImages.push({ src, alt: `${fields.name.value.trim() || '事件'}相关图片`, caption: '' });
      renderRecordImages();
      announce('已将本地图片加入当前记录，保存记录后生效。');
    });
    recordImages.addEventListener('input', (event) => {
      const card = event.target.closest('[data-image-index]');
      if (!card) return;
      const image = draftImages[Number(card.dataset.imageIndex)];
      if (event.target.dataset.imageField === 'alt') image.alt = event.target.value;
      if (event.target.dataset.imageField === 'caption') image.caption = event.target.value;
    });
    recordImages.addEventListener('click', (event) => {
      const button = event.target.closest('[data-image-action]');
      if (!button) return;
      const index = Number(button.closest('[data-image-index]').dataset.imageIndex);
      if (button.dataset.imageAction === 'remove') draftImages.splice(index, 1);
      if (button.dataset.imageAction === 'up' && index > 0) [draftImages[index - 1], draftImages[index]] = [draftImages[index], draftImages[index - 1]];
      if (button.dataset.imageAction === 'down' && index < draftImages.length - 1) [draftImages[index + 1], draftImages[index]] = [draftImages[index], draftImages[index + 1]];
      renderRecordImages();
    });

    Object.values(categoryElements).forEach((item) => item.root.addEventListener('click', handleCategoryAction));
    document.querySelectorAll('[data-add-category]').forEach((button) => button.addEventListener('click', () => addPrimaryCategory(button.dataset.addCategory)));

    byId('libraryUpload').addEventListener('change', async (event) => {
      const files = [...event.target.files];
      event.target.value = '';
      await uploadFiles(files, false);
    });
    byId('fetchLibraryImage').addEventListener('click', async () => {
      const input = byId('libraryUrl');
      const url = input.value.trim();
      if (!url) return announce('请先输入网络图片地址。', true);
      try {
        setBusy('正在拉取网络图片并保存到 assert…');
        const saved = await api('/api/assets/fetch', { method: 'POST', body: { url, prefix: 'library' } });
        input.value = '';
        await refreshState();
        announce(`图片已保存为 ${saved.name}`);
      } catch (error) { announce(`图片拉取失败：${error.message}`, true); }
    });
    byId('assetLibrary').addEventListener('click', deleteAsset);
  }

  async function loadState() {
    const state = await api('/api/database');
    database = state.database;
    assets = state.assets;
    renderDerived();
    startNewRecord();
    saveState.textContent = '本地数据库已连接';
  }

  async function refreshState() {
    const state = await api('/api/database');
    database = state.database;
    assets = state.assets;
    renderDerived();
  }

  function renderDerived() {
    byId('recordMetric').textContent = database.records.length;
    byId('categoryMetric').textContent = database.categories.brandCategories.length + database.categories.reasonCategories.length;
    byId('assetMetric').textContent = assets.length;
    databaseTime.textContent = database.updatedAt ? `更新于 ${formatTimestamp(database.updatedAt)}` : '';
    renderRecordList();
    renderCategories();
    renderAssetPicker();
    renderAssetLibrary();
  }

  function setView(view) {
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
    document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
    history.replaceState(null, '', `#${view}`);
  }

  function renderRecordList() {
    if (!database) return;
    const query = normalize(byId('recordSearch').value);
    const filtered = database.records.filter((record) => normalize([record.id, record.name, record.eventTitle, ...(record.aliases || [])].join(' ')).includes(query));
    recordList.innerHTML = filtered.length ? filtered.map((record) => `
      <button class="record-item${record.id === originalId ? ' is-active' : ''}" data-record-id="${escapeHtml(record.id)}" type="button">
        <span><strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.eventTitle)} · ${escapeHtml(record.id)}</small></span>
        <time datetime="${escapeHtml(record.listedAt)}">${escapeHtml(record.listedAt)}</time>
      </button>`).join('') : '<div class="record-list-empty">没有找到匹配的黑名单记录。</div>';
  }

  function startNewRecord() {
    originalId = '';
    idTouched = false;
    draftImages = [];
    form.reset();
    const today = localDate();
    fields.listedAt.value = today;
    fields.eventDate.value = today;
    fields.country.value = '中国';
    fields.id.value = createId('');
    byId('editMode').textContent = '新增模式';
    byId('editorTitle').textContent = '新建品牌记录';
    byId('deleteRecord').hidden = true;
    populateCategorySelects();
    renderRecordImages();
    renderRecordList();
  }

  function editRecord(id) {
    const record = database.records.find((item) => item.id === id);
    if (!record) return announce('记录不存在，可能已被删除。', true);
    originalId = record.id;
    idTouched = true;
    fields.id.value = record.id;
    fields.name.value = record.name;
    fields.aliases.value = (record.aliases || []).join('，');
    fields.country.value = record.country;
    fields.listedAt.value = record.listedAt;
    fields.eventDate.value = record.eventDate;
    fields.eventTitle.value = record.eventTitle;
    fields.summary.value = record.summary;
    fields.details.value = (record.details || []).join('\n');
    fields.timeline.value = (record.timeline || []).map((item) => `${item.date} | ${item.title} | ${item.description}`).join('\n');
    fields.sources.value = (record.sources || []).map((item) => `${item.label} | ${item.url}`).join('\n');
    fields.resolution.value = record.resolution;
    fields.isDemo.checked = Boolean(record.isDemo);
    draftImages = structuredClone(record.images || []);
    populateCategorySelects(record.category, record.reason);
    byId('editMode').textContent = '编辑已有记录';
    byId('editorTitle').textContent = record.name;
    byId('deleteRecord').hidden = false;
    renderRecordImages();
    renderRecordList();
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const record = collectRecord();
      const next = structuredClone(database);
      const duplicate = next.records.find((item) => item.id === record.id && item.id !== originalId);
      if (duplicate) throw new Error(`记录 ID “${record.id}”已被 ${duplicate.name} 使用`);
      const index = next.records.findIndex((item) => item.id === originalId);
      if (index >= 0) next.records[index] = record;
      else next.records.push(record);
      setBusy('正在写入 JSON 数据库…');
      await persistDatabase(next);
      originalId = record.id;
      editRecord(record.id);
      announce(`“${record.name}”已保存到本地数据库。`);
    } catch (error) { announce(`保存失败：${error.message}`, true); }
  }

  function collectRecord() {
    const details = splitLines(fields.details.value);
    if (!details.length) throw new Error('详细经过至少需要一段');
    if (draftImages.some((image) => !image.alt.trim())) throw new Error('每张图片都必须填写替代文字');
    return {
      id: fields.id.value.trim(),
      isDemo: fields.isDemo.checked,
      name: fields.name.value.trim(),
      aliases: fields.aliases.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      listedAt: fields.listedAt.value,
      category: { primary: fields.categoryPrimary.value, secondary: fields.categorySecondary.value },
      country: fields.country.value.trim(),
      reason: { primary: fields.reasonPrimary.value, secondary: fields.reasonSecondary.value },
      eventTitle: fields.eventTitle.value.trim(),
      eventDate: fields.eventDate.value,
      summary: fields.summary.value.trim(),
      details,
      timeline: parseRows(fields.timeline.value, 'timeline'),
      sources: parseRows(fields.sources.value, 'sources'),
      images: draftImages.map((image) => ({ src: image.src, alt: image.alt.trim(), caption: (image.caption || '').trim() })),
      resolution: fields.resolution.value.trim()
    };
  }

  async function deleteCurrentRecord() {
    if (!originalId) return;
    const record = database.records.find((item) => item.id === originalId);
    if (!record || !confirm(`确定删除“${record.name}”？数据库记录会立即移除，图片文件不会自动删除。`)) return;
    try {
      const next = structuredClone(database);
      next.records = next.records.filter((item) => item.id !== originalId);
      setBusy('正在删除记录…');
      await persistDatabase(next);
      startNewRecord();
      announce(`“${record.name}”已从数据库删除。`);
    } catch (error) { announce(`删除失败：${error.message}`, true); }
  }

  function populateCategorySelects(category = {}, reason = {}) {
    populatePrimary('brand', category.primary);
    populateSecondary('brand', category.secondary);
    populatePrimary('reason', reason.primary);
    populateSecondary('reason', reason.secondary);
  }

  function populatePrimary(kind, wanted) {
    const select = kind === 'brand' ? byId('categoryPrimary') : byId('reasonPrimary');
    const groups = database.categories[categoryElements[kind].key];
    const previous = wanted || select.value;
    select.replaceChildren(...groups.map((group) => option(group.name)));
    if (groups.some((group) => group.name === previous)) select.value = previous;
  }

  function populateSecondary(kind, wanted) {
    const primary = kind === 'brand' ? byId('categoryPrimary') : byId('reasonPrimary');
    const secondary = kind === 'brand' ? byId('categorySecondary') : byId('reasonSecondary');
    const group = database.categories[categoryElements[kind].key].find((item) => item.name === primary.value);
    const previous = wanted || secondary.value;
    secondary.replaceChildren(...(group?.children || []).map(option));
    if (group?.children.includes(previous)) secondary.value = previous;
  }

  function renderCategories() {
    for (const [kind, config] of Object.entries(categoryElements)) {
      const groups = database.categories[config.key];
      config.count.textContent = groups.length;
      config.root.innerHTML = groups.map((group, primaryIndex) => {
        const primaryUsage = database.records.filter((record) => record[config.recordKey].primary === group.name).length;
        return `<section class="category-group" data-kind="${kind}" data-primary-index="${primaryIndex}">
          <div class="category-primary">
            <input data-primary-name value="${escapeHtml(group.name)}" aria-label="一级分类名称">
            <span class="usage">${primaryUsage} 条</span>
            <span><button class="button small" data-category-action="rename-primary" type="button">改名</button> <button class="button small danger" data-category-action="delete-primary" type="button">删除</button></span>
          </div>
          ${group.children.map((child, childIndex) => {
            const usage = database.records.filter((record) => record[config.recordKey].primary === group.name && record[config.recordKey].secondary === child).length;
            return `<div class="category-child" data-child-index="${childIndex}">
              <input data-child-name value="${escapeHtml(child)}" aria-label="二级分类名称">
              <span class="usage">${usage} 条</span>
              <span><button class="button small" data-category-action="rename-child" type="button">改名</button> <button class="button small danger" data-category-action="delete-child" type="button">删除</button></span>
            </div>`;
          }).join('')}
          <div class="category-child-add"><input data-new-child placeholder="新增到“${escapeHtml(group.name)}”"><button class="button small" data-category-action="add-child" type="button">新增二级</button></div>
        </section>`;
      }).join('');
    }
  }

  async function handleCategoryAction(event) {
    const button = event.target.closest('[data-category-action]');
    if (!button) return;
    const groupNode = button.closest('[data-primary-index]');
    const kind = groupNode.dataset.kind;
    const config = categoryElements[kind];
    const primaryIndex = Number(groupNode.dataset.primaryIndex);
    const action = button.dataset.categoryAction;
    const next = structuredClone(database);
    const groups = next.categories[config.key];
    const group = groups[primaryIndex];
    const currentSelection = currentCategorySelection();

    try {
      if (action === 'rename-primary') {
        const name = groupNode.querySelector('[data-primary-name]').value.trim();
        if (!name) throw new Error('一级分类名称不能为空');
        if (groups.some((item, index) => index !== primaryIndex && item.name === name)) throw new Error('该一级分类已经存在');
        const old = group.name;
        group.name = name;
        next.records.forEach((record) => { if (record[config.recordKey].primary === old) record[config.recordKey].primary = name; });
        if (currentSelection[config.recordKey].primary === old) currentSelection[config.recordKey].primary = name;
      }
      if (action === 'delete-primary') {
        const usage = next.records.filter((record) => record[config.recordKey].primary === group.name).length;
        if (usage) throw new Error(`“${group.name}”仍被 ${usage} 条记录使用，请先调整这些记录`);
        if (groups.length === 1) throw new Error('至少需要保留一个一级分类');
        if (!confirm(`确定删除“${group.name}”及其全部二级分类？`)) return;
        groups.splice(primaryIndex, 1);
      }
      if (action === 'add-child') {
        const name = groupNode.querySelector('[data-new-child]').value.trim();
        if (!name) throw new Error('请输入二级分类名称');
        if (group.children.includes(name)) throw new Error('该二级分类已经存在');
        group.children.push(name);
      }
      if (['rename-child', 'delete-child'].includes(action)) {
        const childNode = button.closest('[data-child-index]');
        const childIndex = Number(childNode.dataset.childIndex);
        const old = group.children[childIndex];
        if (action === 'rename-child') {
          const name = childNode.querySelector('[data-child-name]').value.trim();
          if (!name) throw new Error('二级分类名称不能为空');
          if (group.children.some((item, index) => index !== childIndex && item === name)) throw new Error('该二级分类已经存在');
          group.children[childIndex] = name;
          next.records.forEach((record) => {
            if (record[config.recordKey].primary === group.name && record[config.recordKey].secondary === old) record[config.recordKey].secondary = name;
          });
          if (currentSelection[config.recordKey].primary === group.name && currentSelection[config.recordKey].secondary === old) currentSelection[config.recordKey].secondary = name;
        } else {
          const usage = next.records.filter((record) => record[config.recordKey].primary === group.name && record[config.recordKey].secondary === old).length;
          if (usage) throw new Error(`“${group.name} / ${old}”仍被 ${usage} 条记录使用，请先调整这些记录`);
          if (group.children.length === 1) throw new Error('每个一级分类至少需要保留一个二级分类');
          if (!confirm(`确定删除“${group.name} / ${old}”？`)) return;
          group.children.splice(childIndex, 1);
        }
      }
      setBusy('正在更新分类和关联记录…');
      await persistDatabase(next);
      populateCategorySelects(currentSelection.category, currentSelection.reason);
      announce('分类已更新，关联记录已同步。');
    } catch (error) { renderCategories(); announce(`分类操作失败：${error.message}`, true); }
  }

  async function addPrimaryCategory(kind) {
    const prefix = kind === 'brand' ? 'Brand' : 'Reason';
    const primaryInput = byId(`new${prefix}Primary`);
    const secondaryInput = byId(`new${prefix}Secondary`);
    const primary = primaryInput.value.trim();
    const secondary = secondaryInput.value.trim();
    if (!primary || !secondary) return announce('新增分类时请同时填写一级和首个二级分类。', true);
    const config = categoryElements[kind];
    if (database.categories[config.key].some((group) => group.name === primary)) return announce('该一级分类已经存在。', true);
    try {
      const next = structuredClone(database);
      next.categories[config.key].push({ name: primary, children: [secondary] });
      setBusy('正在新增分类…');
      await persistDatabase(next);
      populateCategorySelects(currentCategorySelection().category, currentCategorySelection().reason);
      primaryInput.value = '';
      secondaryInput.value = '';
      announce(`已新增“${primary} / ${secondary}”。`);
    } catch (error) { announce(`新增失败：${error.message}`, true); }
  }

  function currentCategorySelection() {
    return {
      category: { primary: fields.categoryPrimary.value, secondary: fields.categorySecondary.value },
      reason: { primary: fields.reasonPrimary.value, secondary: fields.reasonSecondary.value }
    };
  }

  function renderRecordImages() {
    recordImages.innerHTML = draftImages.length ? draftImages.map((image, index) => `
      <article class="record-image" data-image-index="${index}">
        <img src="${assetUrl(image.src)}" alt="${escapeHtml(image.alt || '图片预览')}">
        <div class="record-image-fields">
          <span class="image-path" title="${escapeHtml(image.src)}">${escapeHtml(image.src)}</span>
          <input data-image-field="alt" value="${escapeHtml(image.alt || '')}" placeholder="替代文字（必填）" aria-label="图片替代文字">
          <input data-image-field="caption" value="${escapeHtml(image.caption || '')}" placeholder="图片说明（可选）" aria-label="图片说明">
          <span><button class="button small" data-image-action="up" type="button" ${index === 0 ? 'disabled' : ''}>上移</button> <button class="button small" data-image-action="down" type="button" ${index === draftImages.length - 1 ? 'disabled' : ''}>下移</button> <button class="button small danger" data-image-action="remove" type="button">移除</button></span>
        </div>
      </article>`).join('') : '<p class="fieldset-copy">当前记录还没有事件图片。</p>';
  }

  function renderAssetPicker() {
    const previous = assetPicker.value;
    const placeholder = option('');
    placeholder.textContent = '选择 assert 中的已有图片';
    assetPicker.replaceChildren(placeholder, ...assets.map((asset) => {
      const node = option(asset.src);
      node.textContent = `${asset.name} · ${formatBytes(asset.size)}`;
      return node;
    }));
    if (assets.some((asset) => asset.src === previous)) assetPicker.value = previous;
  }

  function renderAssetLibrary() {
    byId('assetEmpty').hidden = assets.length > 0;
    byId('assetLibrary').innerHTML = assets.map((asset) => `
      <article class="asset-card">
        <img src="${assetUrl(asset.src)}" alt="${escapeHtml(asset.name)}" loading="lazy">
        <div class="asset-card-body">
          <h3 title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</h3>
          <div class="asset-card-meta"><span>${formatBytes(asset.size)}</span><span>${asset.usedBy.length ? `${asset.usedBy.length} 条记录使用` : '未使用'}</span></div>
          <button class="button danger" data-delete-asset="${escapeHtml(asset.name)}" type="button" ${asset.usedBy.length ? 'disabled' : ''}>${asset.usedBy.length ? `正在被 ${escapeHtml(asset.usedBy.map((item) => item.name).join('、'))} 使用` : '删除本地图片'}</button>
        </div>
      </article>`).join('');
  }

  async function uploadFiles(files, attachToRecord) {
    const supported = files.filter((file) => ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type));
    if (!supported.length) return announce('请选择 PNG、JPEG、GIF 或 WebP 图片。', true);
    let completed = 0;
    for (const file of supported) {
      try {
        if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} 超过 12 MB`);
        setBusy(`正在保存图片 ${completed + 1} / ${supported.length}…`);
        const data = await fileBase64(file);
        const saved = await api('/api/assets/upload', { method: 'POST', body: { data, prefix: fields.id.value || 'evidence' } });
        if (attachToRecord) draftImages.push({ src: saved.src, alt: file.name.replace(/\.[^.]+$/, '') || '事件相关图片', caption: '' });
        completed += 1;
      } catch (error) {
        announce(`图片保存失败：${error.message}`, true);
        break;
      }
    }
    await refreshState();
    renderRecordImages();
    if (completed) announce(`${completed} 张图片已重命名并保存到 assert。`);
  }

  async function deleteAsset(event) {
    const button = event.target.closest('[data-delete-asset]');
    if (!button || button.disabled) return;
    const name = button.dataset.deleteAsset;
    if (!confirm(`确定从 assert 文件夹删除 ${name}？此操作不可撤销。`)) return;
    try {
      setBusy('正在删除本地图片…');
      await api(`/api/assets?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      await refreshState();
      announce(`${name} 已从 assert 删除。`);
    } catch (error) { announce(`删除失败：${error.message}`, true); }
  }

  async function persistDatabase(next) {
    const state = await api('/api/database', { method: 'PUT', body: next });
    database = state.database;
    assets = state.assets;
    renderDerived();
    saveState.textContent = '本地数据库已保存';
  }

  function parseRows(value, kind) {
    return splitLines(value).map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (kind === 'timeline') {
        if (parts.length < 3 || !parts[0] || !parts[1] || !parts.slice(2).join(' | ')) throw new Error(`时间线第 ${index + 1} 行格式不完整`);
        return { date: parts[0], title: parts[1], description: parts.slice(2).join(' | ') };
      }
      if (parts.length < 2 || !parts[0] || !parts.slice(1).join('|')) throw new Error(`来源第 ${index + 1} 行格式不完整`);
      return { label: parts[0], url: parts.slice(1).join('|') };
    });
  }

  function splitLines(value) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
  function normalize(value) { return String(value || '').toLowerCase().replace(/[\s·•—_\-（）()【】\[\]]+/g, ''); }
  function createId(value) {
    const ascii = String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const encoded = [...String(value || '')].filter((char) => !/^[\x00-\x7f]$/.test(char)).map((char) => char.codePointAt(0).toString(36)).join('-');
    return ['brand', ascii, encoded].filter(Boolean).join('-') || `brand-${Date.now().toString(36)}`;
  }
  function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function formatTimestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function formatBytes(value) {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  function assetUrl(src) { return `/files/${encodeURIComponent(String(src).replace(/^assert\//, ''))}`; }
  function option(value) { const node = document.createElement('option'); node.value = value; node.textContent = value; return node; }
  function fileBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(reader.error || new Error('图片无法读取'));
      reader.readAsDataURL(file);
    });
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  }

  function setBusy(message) {
    saveState.textContent = message;
    announce(message);
  }

  function announce(message, isError = false) {
    clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle('is-error', isError);
    saveState.textContent = isError ? '操作未完成' : message;
    noticeTimer = setTimeout(() => { notice.hidden = true; }, isError ? 8000 : 4200);
  }

  async function api(url, options = {}) {
    const init = { method: options.method || 'GET', headers: {} };
    if (options.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, init);
    const value = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(value?.error || `HTTP ${response.status}`);
    return value;
  }
})();
