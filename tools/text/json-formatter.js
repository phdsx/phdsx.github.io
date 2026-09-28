(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('json-input'), status = $('status');
  const PAGE_SIZE = 200, MAX_BYTES = 2 * 1024 * 1024;
  const workerURL = new URL('json-formatter-worker.js', document.currentScript.src);
  let worker, timer, revision = 0, result = null, mode = 'code', page = 0, compressed = false;
  let lines = [], visible = [], expanded = new Set(), errorOffset, filename = 'formatted.json';
  function feedback(message) { status.textContent = message; }
  function busy(active) {
    document.querySelector('.json-result-panel').setAttribute('aria-busy', String(active));
    $('format').disabled = $('compress').disabled = active;
  }
  function cancel() {
    revision++; worker?.terminate(); worker = null; clearTimeout(timer); busy(false);
  }
  function invalidate() {
    cancel(); result = null; lines = []; visible = []; page = 0; expanded.clear();
    $('json-error').hidden = true; input.removeAttribute('aria-invalid');
    $('summary').textContent = '等待格式化';
    for (const id of ['copy', 'download', 'expand', 'collapse']) $(id).disabled = true;
    render();
  }
  function showError(error) {
    $('json-error').hidden = false;
    $('error-message').textContent = error.message + (error.line ? `（第 ${error.line} 行，第 ${error.column} 列）` : '');
    errorOffset = error.offset;
    $('locate').hidden = !Number.isInteger(errorOffset);
    input.setAttribute('aria-invalid', 'true');
    $('summary').textContent = '未能解析';
    feedback('处理失败，原始输入已保留。请修改后重试。');
  }
  function process(compact = false) {
    invalidate();
    if (!input.value.trim()) { showError({ message: '请先粘贴 JSON 文本或上传 .json 文件。' }); return; }
    if (input.value.length > MAX_BYTES || new TextEncoder().encode(input.value).length > MAX_BYTES) {
      showError({ message: '内容超过 2 MiB，请拆分后再处理。' }); return;
    }
    const ticket = revision;
    busy(true); feedback('正在本地校验与格式化…');
    try {
      worker = new Worker(workerURL);
      timer = setTimeout(() => {
        if (ticket !== revision) return;
        cancel(); showError({ message: '处理超过 5 秒，已停止。请缩小数据后重试。' });
      }, 5000);
      worker.onerror = event => {
        event.preventDefault();
        if (ticket !== revision) return;
        cancel(); showError({ message: '后台解析线程无法启动，请通过站点或本地 HTTP 服务打开页面后重试。' });
      };
      worker.onmessage = ({ data }) => {
        if (ticket !== revision) return;
        cancel();
        if (data.error) { showError(data.error); return; }
        result = data; compressed = compact; page = 0;
        if (data.tree.entries) expanded.add(data.tree.id);
        lines = (compact ? data.compact : data.output).split('\n');
        buildVisible();
        for (const id of ['copy', 'download', 'expand', 'collapse']) $(id).disabled = false;
        $('summary').textContent = `${data.count.toLocaleString()} 个节点 · ${compact ? '已压缩' : '已校验'}`;
        render();
        feedback(compact ? '已压缩，复制或下载可获取完整结果。原始输入已保留。' : '格式化完成，数字原始值已保留。');
      };
      worker.postMessage({ source: input.value, indent: Number($('indent').value) });
    } catch {
      cancel(); showError({ message: '无法启动本地解析，请使用支持 Web Worker 的浏览器并通过 HTTP 服务访问。' });
    }
  }
  function span(type, text) {
    const element = document.createElement('span'); element.className = 'json-' + type; element.textContent = text; return element;
  }
  function clip(text, limit = 1000) { return text.length > limit ? text.slice(0, limit) + '…（预览已截断）' : text; }
  function highlighted(text) {
    const fragment = document.createDocumentFragment();
    const pattern = /"(?:\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(document.createTextNode(text.slice(last, match.index)));
      const raw = match[0];
      const type = raw[0] === '"' ? (/^\s*:/.test(text.slice(match.index + raw.length)) ? 'key' : 'string') : raw === 'null' ? 'null' : ['true', 'false'].includes(raw) ? 'boolean' : 'number';
      fragment.append(span(type, raw)); last = match.index + raw.length;
    }
    fragment.append(document.createTextNode(text.slice(last))); return fragment;
  }
  function buildVisible() {
    visible = [];
    if (!result) return;
    const stack = [{ node: result.tree, label: '根', depth: 0 }];
    while (stack.length) {
      const row = stack.pop(); visible.push(row);
      if (!row.node.entries || !expanded.has(row.node.id)) continue;
      for (let index = row.node.entries.length - 1; index >= 0; index--) {
        const entry = row.node.entries[index];
        stack.push({ node: entry.node, label: entry.key ?? `[${index}]`, depth: row.depth + 1 });
      }
    }
  }
  function render() {
    $('code-view').setAttribute('aria-pressed', String(mode === 'code'));
    $('tree-view').setAttribute('aria-pressed', String(mode === 'tree'));
    $('code-result').hidden = mode !== 'code' || !result;
    $('tree-result').hidden = mode !== 'tree' || !result;
    $('empty-result').hidden = !!result;
    $('expand').hidden = $('collapse').hidden = mode !== 'tree';
    $('indent').disabled = mode === 'tree';
    $('code-result').replaceChildren(); $('tree-result').replaceChildren();
    $('pager').hidden = !result;
    if (!result) return;
    const source = mode === 'code' ? lines : visible;
    const pages = Math.max(1, Math.ceil(source.length / PAGE_SIZE));
    page = Math.min(page, pages - 1);
    const fragment = document.createDocumentFragment();
    source.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((item, index) => {
      const row = document.createElement('div');
      if (mode === 'code') {
        row.className = 'json-code-line';
        const number = span('line-number', String(page * PAGE_SIZE + index + 1));
        number.setAttribute('aria-hidden', 'true');
        const code = document.createElement('code'); code.append(highlighted(clip(item, 2000)));
        row.append(number, code);
      } else {
        row.className = 'json-tree-row'; row.style.paddingLeft = `${item.depth * 16}px`;
        const { node } = item;
        if (node.entries) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'json-tree-toggle';
          button.textContent = expanded.has(node.id) ? '▾' : '▸';
          button.setAttribute('aria-expanded', String(expanded.has(node.id)));
          button.setAttribute('aria-label', `${expanded.has(node.id) ? '折叠' : '展开'} ${clip(item.label, 100)}`);
          button.addEventListener('click', () => {
            if (expanded.has(node.id)) expanded.delete(node.id); else expanded.add(node.id);
            buildVisible(); render();
            // Restore keyboard focus after the bounded page is rebuilt.
            $('tree-result').querySelector(`[data-node="${node.id}"]`)?.focus();
          });
          button.dataset.node = String(node.id);
          row.append(button, span('key', clip(item.label, 300) + ': '), span('tree-meta', node.type === 'array' ? `Array [${node.entries.length} 个元素]` : `Object {${node.entries.length} 个属性}`));
        } else row.append(span('tree-leaf', '·'), span('key', clip(item.label, 300) + ': '), span(node.type, clip(node.raw)));
      }
      fragment.append(row);
    });
    $(mode === 'code' ? 'code-result' : 'tree-result').append(fragment);
    $('previous').disabled = page === 0; $('next').disabled = page === pages - 1;
    const clipped = mode === 'code' && source.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).some(line => line.length > 2000);
    $('page-info').textContent = `${page + 1} / ${pages} 页 · ${source.length} ${mode === 'code' ? '行' : '项'}${clipped ? ' · 长行已截断预览' : ''}`;
  }
  function output() { return compressed ? result.compact : result.output; }
  input.addEventListener('input', () => { invalidate(); feedback('输入已修改，请点击格式化。'); });
  $('format').addEventListener('click', () => process(false));
  $('compress').addEventListener('click', () => process(true));
  $('indent').addEventListener('change', () => { if (result) process(false); });
  $('clear').addEventListener('click', () => {
    input.value = ''; $('json-file').value = ''; filename = 'formatted.json'; invalidate();
    feedback('已清空输入和结果。'); input.focus();
  });
  $('sample').addEventListener('click', () => {
    input.value = '{"名称":"JSON 格式化示例","版本":1.0,"启用":true,"备注":null,"大整数":900719925474099312345,"用户":[{"姓名":"小明","标签":["中文","开发"],"配置":{"主题":"Ubuntu","通知":false}},{"姓名":"小红","标签":[]}],"空对象":{}}';
    filename = 'example.json'; process();
  });
  $('locate').addEventListener('click', () => {
    input.focus(); input.setSelectionRange(errorOffset, Math.min(input.value.length, errorOffset + 1));
    feedback('已选中错误位置；输入框中的行列从 1 开始计算。');
  });
  for (const view of ['code', 'tree']) $(view + '-view').addEventListener('click', () => { mode = view; page = 0; render(); });
  $('expand').addEventListener('click', () => {
    const stack = [result.tree];
    while (stack.length) { const node = stack.pop(); if (node.entries) { expanded.add(node.id); for (const entry of node.entries) stack.push(entry.node); } }
    page = 0; buildVisible(); render(); feedback('已全部展开，较长结果按每页 200 项显示。');
  });
  $('collapse').addEventListener('click', () => { expanded.clear(); page = 0; buildVisible(); render(); feedback('已全部折叠。'); });
  for (const [id, delta] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => {
    page += delta; render(); $(mode === 'code' ? 'code-result' : 'tree-result').scrollTop = 0;
  });
  $('copy').addEventListener('click', async () => {
    if (!result) return;
    const text = output(); const ticket = revision;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const field = document.createElement('textarea'); field.value = text; field.style.cssText = 'position:fixed;left:-9999px';
        document.body.append(field); field.select();
        let copied;
        try { copied = document.execCommand('copy'); } finally { field.remove(); }
        if (!copied) throw new Error('copy');
      }
      if (ticket === revision) feedback('已复制完整结果。');
    } catch { if (ticket === revision) feedback('复制失败，浏览器未允许访问剪贴板。可下载 JSON 或手动选择代码复制。'); }
  });
  $('download').addEventListener('click', () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([output()], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); feedback('已开始下载完整 JSON。');
  });
  async function loadFiles(files) {
    cancel();
    if (files.length !== 1) { feedback('请一次上传一个 .json 文件。'); return; }
    const file = files[0];
    if (!/\.json$/i.test(file.name)) { feedback('无效文件：请上传扩展名为 .json 的文件。'); return; }
    if (file.size > MAX_BYTES) { feedback('文件超过 2 MiB，请拆分后再上传。'); return; }
    if (!file.size) { feedback('文件为空，请选择包含 JSON 内容的文件。'); return; }
    // An existing valid result stays intact until a file has been read successfully.
    const ticket = revision; feedback(`正在读取 ${file.name}…`);
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (ticket !== revision) return;
      input.value = text; filename = file.name; process();
    } catch {
      if (ticket === revision) feedback('文件读取失败：请检查文件是否可访问，以及是否使用 UTF-8 编码。原始输入已保留。');
    }
  }
  $('upload').addEventListener('click', () => $('json-file').click());
  $('json-file').addEventListener('change', event => { const files = [...event.target.files]; event.target.value = ''; if (files.length) loadFiles(files); });
  const drop = $('drop-zone'); let dragDepth = 0;
  drop.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; drop.classList.add('json-dragging'); });
  drop.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  drop.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.classList.remove('json-dragging'); } });
  drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('json-dragging'); loadFiles([...event.dataTransfer.files]); });
  document.addEventListener('dragover', event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
  document.addEventListener('drop', event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
  render();
})();
