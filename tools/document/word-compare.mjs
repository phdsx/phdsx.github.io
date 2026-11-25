import { compareDocuments } from './word-compare-core.mjs';
import { canRepresentText, demoFile, exportDocument, readDocument, stagedWord, validateFile, withDrafts } from './word-compare-document.mjs';

const RUN_STYLES = ['color', 'background-color', 'font-family', 'font-size', 'font-style', 'font-weight',
  'font-variant-caps', 'font-stretch', 'letter-spacing', 'word-spacing', 'text-transform', 'text-shadow', 'text-decoration-line',
  'text-decoration-color', 'text-decoration-style', 'text-decoration-thickness', 'vertical-align', 'white-space', 'direction', 'unicode-bidi'];
const BOX_STYLES = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top', 'border-right', 'border-bottom', 'border-left'];
const PARAGRAPH_STYLES = [...RUN_STYLES, ...BOX_STYLES, 'line-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'min-height', 'text-align', 'text-indent', 'tab-size', 'hyphens', 'overflow-wrap', 'word-break'];
const CELL_STYLES = [...BOX_STYLES, 'background-color'];
const LOCAL_PREVIEW_CLASS = 'word-page';
const DEFAULT_PAGE_WIDTH = 816;

function copyProperties(style, names, parent) {
  const result = {};
  for (const name of names) {
    const value = style.getPropertyValue(name);
    if (value && (!parent || parent.getPropertyValue(name) !== value || name === 'text-decoration-line')) result[name] = value;
  }
  return result;
}

function setProperties(node, properties) {
  for (const [name, value] of Object.entries(properties)) node.style.setProperty(name, value);
}

function pageGeometry(page) {
  if (!page) return { width: DEFAULT_PAGE_WIDTH, left: 72, right: 72 };
  if (!page.style.width) page.style.width = `${DEFAULT_PAGE_WIDTH}px`;
  if (!page.style.minHeight) page.style.minHeight = '1056px';
  if (!page.style.paddingLeft) page.style.paddingLeft = '72px';
  if (!page.style.paddingRight) page.style.paddingRight = '72px';
  const styles = getComputedStyle(page);
  return { width: Number.parseFloat(styles.width) || DEFAULT_PAGE_WIDTH,
    left: Number.parseFloat(styles.paddingLeft) || 0, right: Number.parseFloat(styles.paddingRight) || 0 };
}

function sanitizePreview(body) {
  body.querySelectorAll('a').forEach(link => link.removeAttribute('href'));
  body.querySelectorAll('iframe, object, embed, script').forEach(node => node.remove());
}

function paragraphGapBefore(node) {
  let pixels = 0;
  for (let previous = node.previousElementSibling; previous?.localName === 'p'; previous = previous.previousElementSibling) {
    if (previous.textContent.trim() || previous.querySelector('img, svg, math')) break;
    const style = getComputedStyle(previous);
    pixels += previous.getBoundingClientRect().height + (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0);
  }
  return pixels;
}

function captureParagraph(source, stamp) {
  const output = document.createElement('p');
  const style = getComputedStyle(source);
  setProperties(output, copyProperties(style, PARAGRAPH_STYLES));
  const after = getComputedStyle(source, '::before');
  const marker = { styles: copyProperties(after, RUN_STYLES), width: after.width };
  const visuals = Array.from(source.querySelectorAll('img')).map(image => {
    const style = getComputedStyle(image);
    return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height), alignment: getComputedStyle(source).textAlign };
  });

  function add(sourceNode, outputNode, parentStyle) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      outputNode.append(document.createTextNode(sourceNode.data));
      return;
    }
    if (sourceNode.nodeType !== Node.ELEMENT_NODE || sourceNode.id.startsWith(stamp)) return;
    const tag = sourceNode.localName;
    if (['img', 'svg', 'math', 'figure', 'aside', 'sup'].includes(tag) && (tag !== 'sup' || sourceNode.querySelector('a'))) return;
    if (!['span', 'a', 'sup', 'sub', 'br', 'wbr', 'b', 'strong', 'em', 'i', 'u', 's'].includes(tag)) return;
    if (tag === 'wbr') { outputNode.append(document.createTextNode('\u2011')); return; }
    const clone = document.createElement(tag === 'a' ? 'span' : tag);
    const ownStyle = getComputedStyle(sourceNode);
    setProperties(clone, copyProperties(ownStyle, RUN_STYLES, parentStyle));
    if (sourceNode.classList.contains(`${LOCAL_PREVIEW_CLASS}-tab-stop`)) {
      clone.dataset.wordTab = '';
      clone.style.display = ownStyle.display;
      clone.style.width = ownStyle.width;
    }
    for (const child of sourceNode.childNodes) add(child, clone, ownStyle);
    outputNode.append(clone);
  }
  for (const child of source.childNodes) add(child, output, style);
  return { template: output, marker, visuals, gapBefore: source.textContent.trim() || visuals.length ? paragraphGapBefore(source) : 0 };
}

function captureTable(table) {
  if (!table) return null;
  const localCols = [...table.children].find(node => node.localName === 'colgroup');
  const columns = [...(localCols?.children || [])].map(column => column.getBoundingClientRect().width || Number.parseFloat(getComputedStyle(column).width));
  if (!columns.length || columns.some(width => !Number.isFinite(width) || width <= 0)) return null;
  const css = getComputedStyle(table);
  return { columns, width: table.getBoundingClientRect().width || columns.reduce((a, b) => a + b, 0),
    align: table.style.marginLeft === 'auto' ? table.style.marginRight === 'auto' ? 'center' : 'right' : 'left',
    margin: Number.parseFloat(css.marginLeft) || 0, gapBefore: paragraphGapBefore(table) };
}

async function measureWord(file, doc, drafts) {
  const stamp = `wdfmt${Math.random().toString(36).slice(2)}_`;
  const staged = stagedWord(new Uint8Array(await file.arrayBuffer()), doc, drafts, stamp);
  if (!staged) return null;
  const host = document.createElement('div');
  host.className = 'word-preview-host layout-probe';
  host.setAttribute('aria-hidden', 'true');
  const shadow = host.attachShadow({ mode: 'open' });
  const styles = document.createElement('div');
  const body = document.createElement('div');
  const frame = document.createElement('style');
  frame.textContent = `:host { display:block; color:#222; font-family:'Times New Roman',serif; font-size:12pt; }
.${LOCAL_PREVIEW_CLASS}-wrapper { background:transparent !important; padding:0 !important; align-items:flex-start !important; }
.${LOCAL_PREVIEW_CLASS}-wrapper > section.${LOCAL_PREVIEW_CLASS} { margin:0 0 14px !important; box-shadow:0 1px 4px #182b2826 !important; }`;
  shadow.append(styles, frame, body);
  document.body.append(host);
  try {
    await globalThis.docx.renderAsync(staged, body, styles, {
      className: LOCAL_PREVIEW_CLASS, inWrapper: true, useBase64URL: true, ignoreLastRenderedPageBreak: false,
      renderAltChunks: false, renderChanges: false, renderComments: false, experimental: true,
    });
    sanitizePreview(body);
    const pages = [...body.querySelectorAll(`section.${LOCAL_PREVIEW_CLASS}`)].map(node => ({ node, geometry: pageGeometry(node) }));
    if (!pages.length) return null;
    const byPage = new Map(pages.map(({ node, geometry }) => [node, geometry]));
    const paragraphs = new Map();
    const tables = new Map();
    const cells = new Map();
    for (const bookmark of body.querySelectorAll(`span[id^="${stamp}"]`)) {
      const id = Number(bookmark.id.slice(stamp.length));
      const source = bookmark.closest('p');
      if (!source || paragraphs.has(id)) continue;
      const page = byPage.get(source.closest(`section.${LOCAL_PREVIEW_CLASS}`));
      const description = captureParagraph(source, stamp);
      const cell = source.closest('td,th');
      const table = cell?.closest('table');
      if (cell && !cells.has(cell)) {
        const css = getComputedStyle(cell);
        cells.set(cell, { properties: copyProperties(css, CELL_STYLES), vertical: css.verticalAlign, hidden: css.display === 'none' });
      }
      if (table && !tables.has(table)) tables.set(table, captureTable(table));
      paragraphs.set(id, { ...description, page: page || pages[0].geometry, table: tables.get(table), cell: cells.get(cell) });
    }
    host.classList.remove('layout-probe');
    host.removeAttribute('aria-hidden');
    return { paragraphs, pages, host, width: pages[0].geometry.width, multiColumn: Boolean(body.querySelector('article[style*="column-count"]')) };
  } finally {
    host.remove();
  }
}

function getWordFormat(side, id) {
  return state.layouts[side]?.paragraphs.get(id);
}

function wordFrame(page, gap = 0) {
  const container = document.createElement('div');
  container.className = 'word-frame';
  container.style.width = `${page.width}px`;
  container.style.paddingLeft = `${page.left}px`;
  container.style.paddingRight = `${page.right}px`;
  if (gap) container.style.paddingTop = `${gap}px`;
  return container;
}

function textSlots(parent) {
  const slots = [];
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) { slots.push({ node, text: node.data }); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.localName === 'br') { slots.push({ text: '\n' }); return; }
    if (node.hasAttribute('data-word-tab')) { slots.push({ text: '\t' }); return; }
    node.childNodes.forEach(visit);
  }
  visit(parent);
  return slots;
}

function sliceParts(parts, start, length) {
  const output = [];
  let offset = 0;
  for (const item of parts) {
    const end = offset + item.text.length;
    const left = Math.max(start, offset);
    const right = Math.min(start + length, end);
    if (left < right) output.push({ text: item.text.slice(left - offset, right - offset), changed: item.changed });
    if (end >= start + length) break;
    offset = end;
  }
  return output;
}

function styledParagraph(format, parts, side, options = {}) {
  const paragraph = format.template.cloneNode(true);
  paragraph.className = `word-paragraph ${options.cell ? 'cell-text' : 'para-text'}`;
  if (options.heading) {
    paragraph.setAttribute('role', 'heading');
    paragraph.setAttribute('aria-level', String(Math.min(6, options.heading + 2)));
  }
  const slots = textSlots(paragraph);
  const expected = parts.map(part => part.text).join('');
  const actual = slots.map(slot => slot.text).join('');
  if (expected === actual) {
    let offset = 0;
    for (const slot of slots) {
      if (slot.node) {
        const partsHere = sliceParts(parts, offset, slot.text.length);
        if (partsHere.some(part => part.changed)) {
          const fragment = document.createDocumentFragment();
          appendText(fragment, partsHere, side);
          slot.node.replaceWith(fragment);
        }
      }
      offset += slot.text.length;
    }
  } else {
    paragraph.replaceChildren();
    paragraph.style.whiteSpace = 'pre-wrap';
    appendText(paragraph, parts, side);
  }
  if (options.label) {
    const marker = document.createElement('span');
    marker.className = 'list-label word-list-label';
    marker.textContent = options.label;
    setProperties(marker, format.marker.styles);
    if (/^\d/.test(format.marker.width) && Number.parseFloat(format.marker.width) > 0) marker.style.minWidth = format.marker.width;
    paragraph.prepend(marker);
  }
  return paragraph;
}

const $ = id => document.getElementById(id);
const sides = ['left', 'right'];
const labels = { insert: '新增', delete: '删除', modify: '修改' };
const sideLabels = { left: '原稿', right: '修订稿' };
const zoomLevels = [50, 60, 75, 90, 100, 110, 125, 150, 175, 200];
const state = {
  files: { left: null, right: null }, errors: { left: '', right: '' }, documents: new WeakMap(),
  operation: 0, busy: false, stopWorker: null, result: null, active: null, filter: 'all',
  expanded: new Set(), rowPairs: [], listButtons: new Map(), syncing: false, scrollFrame: 0,
  loaded: null, previewUrls: new Map(), drafts: new Map(), saved: '', editing: false, editor: null, saving: false, feedback: '',
  layouts: { left: null, right: null }, layoutCache: { left: new WeakMap(), right: new WeakMap() },
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateFiles() {
  for (const side of sides) {
    const file = state.files[side];
    const error = state.errors[side];
    const card = $(`${side}-card`);
    const name = $(`${side}-name`);
    name.textContent = file?.name || `选择${sideLabels[side]}`;
    name.title = file?.name || '';
    $(`${side}-detail`).textContent = file ? formatSize(file.size) : '点击选择或将 .docx 拖到这里';
    card.querySelector('.file-action').textContent = file ? '更换文件' : '选择文件';
    card.classList.toggle('selected', Boolean(file));
    card.classList.toggle('invalid', Boolean(error));
    $(`${side}-error`).hidden = !error;
    $(`${side}-error`).textContent = error;
    $(`${side}-file`).setAttribute('aria-invalid', String(Boolean(error)));
  }
  $('start').disabled = state.busy || sides.some(side => !state.files[side] || state.errors[side]);
  $('demo').disabled = state.busy;
  $('swap').disabled = state.busy;
}

function status(message = '', error = false) {
  $('status').textContent = message;
  $('status').hidden = !message;
  $('status').classList.toggle('error', error);
}

function clearResult() {
  state.result = null;
  state.active = null;
  state.filter = 'all';
  state.expanded.clear();
  state.rowPairs = [];
  state.listButtons.clear();
  for (const side of sides) $(`${side}-content`).replaceChildren();
  $('change-list').replaceChildren();
  $('result').hidden = true;
  document.body.classList.remove('has-result');
}

function draftSignature() {
  return state.drafts.size ? JSON.stringify([...state.drafts].sort(([a], [b]) => a - b)) : '';
}

function unsaved() { return state.drafts.size > 0 && draftSignature() !== state.saved; }

function discardDrafts() {
  if (state.saving || (unsaved() && !window.confirm('当前修订稿有未另存的修改。继续将放弃这些修改。'))) return false;
  state.drafts.clear();
  state.saved = '';
  state.feedback = '';
  state.editing = false;
  state.loaded = null;
  state.layouts = { left: null, right: null };
  for (const url of state.previewUrls.values()) URL.revokeObjectURL(url);
  state.previewUrls.clear();
  return true;
}

function cancel() {
  state.operation++;
  state.stopWorker?.();
  state.busy = false;
}

function choose(side, file) {
  if (!file || !discardDrafts()) return false;
  cancel();
  clearResult();
  status();
  state.files[side] = file;
  state.errors[side] = '';
  try { validateFile(file); }
  catch (error) { state.errors[side] = error.message; }
  updateFiles();
  return true;
}

async function parsed(file) {
  if (!state.documents.has(file)) state.documents.set(file, readDocument(file));
  return state.documents.get(file);
}

function layoutFor(side, file, doc) {
  const edits = side === 'right' ? new Map(state.drafts) : new Map();
  if (edits.size) return measureWord(file, doc, edits);
  const cache = state.layoutCache[side];
  if (!cache.has(file)) cache.set(file, measureWord(file, doc, edits));
  return cache.get(file);
}

function compareInWorker(left, right, onProgress) {
  return new Promise((resolve, reject) => {
    let worker;
    function finish(action, value) {
      worker?.terminate();
      if (state.stopWorker === cancelWorker) state.stopWorker = null;
      action(value);
    }
    function cancelWorker() { finish(reject, new Error('cancelled')); }
    try {
      worker = new Worker(new URL('./word-compare-worker.mjs', import.meta.url), { type: 'module' });
    } catch {
      resolve(compareDocuments(left, right, onProgress));
      return;
    }
    state.stopWorker = cancelWorker;
    worker.onmessage = event => {
      const { progress, result, error } = event.data;
      if (progress !== undefined) onProgress?.(progress);
      if (result) finish(resolve, result);
      if (error) finish(reject, new Error(error));
    };
    worker.onerror = event => {
      event.preventDefault();
      worker.terminate();
      try { finish(resolve, compareDocuments(left, right, onProgress)); }
      catch (error) { finish(reject, error); }
    };
    worker.postMessage([left, right]);
  });
}

async function compare(refresh = false) {
  if (state.busy || sides.some(side => !state.files[side] || state.errors[side])) return;
  const view = refresh === true ? captureView() : null;
  const filter = state.filter;
  const expanded = new Set(state.expanded);
  const run = ++state.operation;
  state.busy = true;
  updateFiles();
  updateEditorUI();
  status('正在读取两份文档…');
  try {
    const parsedFiles = await Promise.allSettled(sides.map(side => parsed(state.files[side])));
    if (run !== state.operation) return;
    if (parsedFiles.some(file => file.status === 'rejected')) {
      parsedFiles.forEach((file, i) => {
        if (file.status === 'rejected') state.errors[sides[i]] = file.reason.message;
      });
      status('读取失败。请按文件旁的提示处理后再试。', true);
      return;
    }
    const [left, right] = parsedFiles.map(file => file.value);
    state.loaded = { left, right };
    status('正在对齐内容并还原 Word 版式…');
    const layouts = Promise.allSettled([layoutFor('left', state.files.left, left), layoutFor('right', state.files.right, right)]);
    const [result, measured] = await Promise.all([compareInWorker({ blocks: left.blocks }, withDrafts(right, state.drafts)), layouts]);
    if (run !== state.operation) return;
    clearResult();
    state.result = result;
    if (view) { state.filter = filter; state.expanded = expanded; }
    const notices = [left, right].flatMap((doc, i) => doc.warnings.map(warning => `${sideLabels[sides[i]]}：${warning}`));
    state.layouts = Object.fromEntries(sides.map((side, i) => [side, measured[i].status === 'fulfilled' ? measured[i].value : null]));
    for (const side of sides) {
      if (!state.layouts[side]) notices.push(`${sideLabels[side]}的版式未能预览，已显示可比较的内容。`);
      else if (state.layouts[side].multiColumn) notices.push(`${sideLabels[side]}的分栏可在「原页预览」中查看。`);
    }
    showResult(notices, view);
    status();
  } catch (error) {
    if (run === state.operation) {
      console.error(error);
      clearResult();
      status('比较未完成。请重试，或将较大的文档拆分后再比较。', true);
    }
  } finally {
    if (run === state.operation) {
      state.busy = false;
      updateFiles();
      updateEditorUI();
    }
  }
}

function showResult(notices, view) {
  const { rows, changes } = state.result;
  const counts = { insert: 0, delete: 0, modify: 0 };
  for (const change of changes) counts[change.type]++;
  const graphics = changes.filter(change => change.category === 'graphic').length;
  $('summary').textContent = changes.length ? `${changes.length} 处差异 · 新增 ${counts.insert} · 删除 ${counts.delete} · 修改 ${counts.modify}`
    : '在已比较范围内未发现差异';
  if (graphics) $('summary').textContent += ` · 图形 ${graphics}`;
  $('filters').querySelector('[data-filter="graphic"]').hidden = !graphics;
  if (!graphics && state.filter === 'graphic') state.filter = 'all';
  for (const side of sides) {
    const title = $(`${side}-title`);
    title.textContent = state.files[side].name;
    title.title = state.files[side].name;
  }
  $('result-note').textContent = notices.join(' ');
  $('result-note').hidden = !notices.length;
  $('result').hidden = false;
  $('show-layout').disabled = !sides.some(side => state.layouts[side]);
  document.body.classList.add('has-result');
  $('only').disabled = !rows.length || !changes.length;
  if ($('only').disabled) $('only').checked = false;
  renderRows(view);
  renderList();
  if (!view) for (const side of sides) {
    const pane = $(`${side}-scroll`);
    pane.scrollTop = 0;
    pane.scrollLeft = 0;
  }
  $(view && state.editing ? 'edit-mode' : 'result-title').focus({ preventScroll: true });
}

function badge(type, extraClass = '') {
  return element('span', `badge ${type} ${extraClass}`.trim(), labels[type]);
}

function appendText(target, parts, side) {
  for (const part of parts) {
    if (!part.changed) target.append(document.createTextNode(part.text));
    else target.append(element(side === 'left' ? 'del' : 'ins', `mark ${side === 'left' ? 'old' : 'new'}`, part.text));
  }
}

function editButton(label, cell) {
  const button = element('button', 'inline-edit', '编辑');
  button.type = 'button';
  button.dataset.edit = cell === undefined ? '' : String(cell);
  button.setAttribute('aria-label', `编辑${label}`);
  return button;
}

function graphicPreview(side, graphic) {
  const key = `${side}:${graphic.id}`;
  const cached = state.previewUrls.get(key);
  if (cached) return cached;
  const data = state.loaded?.[side].previews.get(graphic.id);
  if (!data?.bytes) return '';
  const url = URL.createObjectURL(new Blob([data.bytes], { type: data.mimeType }));
  state.previewUrls.set(key, url);
  return url;
}

function renderGraphic(content, row, side) {
  const data = row[side];
  const preview = graphicPreview(side, data);
  const graphic = element('figure', 'graphic');
  const format = getWordFormat(side, data.renderId);
  const visual = preview && format?.visuals[data.visual];
  const styled = visual && visual.width > 0 && visual.height > 0;
  if (row.change) {
    const type = state.result.changes[row.change - 1].type;
    graphic.classList.add('graphic-change', side === 'left' ? 'old' : 'new');
    graphic.append(badge(type, 'margin-label'));
  }
  const details = element('figcaption', 'graphic-label');
  details.append(element('strong', '', data.title));
  if (data.description) details.append(element('span', '', data.description));
  const description = data.linked ? '外部资源 · 对比链接' : data.type === 'image' ? '仅比较图片，缩略图不可用' : '按对象结构和关联内容比较';
  const fallback = element('span', 'graphic-fallback', description);
  fallback.hidden = Boolean(preview);
  details.append(fallback);
  if (preview) {
    const image = element('img', 'graphic-image');
    image.alt = data.description || data.title;
    image.loading = 'lazy';
    image.src = preview;
    image.addEventListener('load', alignRows, { once: true });
    image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; alignRows(); }, { once: true });
    if (styled) {
      image.style.width = `${visual.width}px`;
      image.style.aspectRatio = `${visual.width}/${visual.height}`;
    }
    graphic.append(image);
  }
  graphic.append(details);
  if (styled) {
    content.classList.add('word-row-content');
    graphic.classList.add('word-figure');
    graphic.style.textAlign = visual.alignment;
    const frame = wordFrame(format.page, format.gapBefore);
    frame.append(graphic);
    content.append(frame);
  } else content.append(graphic);
}

function documentRow(row, side) {
  const data = row[side];
  const root = element('div', `doc-row${row.changes.length ? ' changed' : ''}${data ? '' : ' no-match'}`);
  root.dataset.key = `r${row.index}`;
  root.dataset.row = row.index;
  const content = element('div', 'row-content');
  root.append(content);
  if (!data) {
    const empty = element('div', 'empty-block');
    empty.append(element('span', '', '此版本无对应内容'));
    content.append(empty);
    return root;
  }

  if (row.kind === 'graphic') {
    root.classList.add('graphic-row');
    renderGraphic(content, row, side);
    return root;
  }

  if (row.kind === 'paragraph') {
    if (row.change) content.append(badge(state.result.changes[row.change - 1].type, 'margin-label'));
    const format = getWordFormat(side, data.renderId);
    if (format) {
      content.classList.add('word-row-content');
      const frame = wordFrame(format.page, format.gapBefore);
      frame.append(styledParagraph(format, row.parts[side], side, data));
      content.append(frame);
      if (side === 'right' && data.target) content.append(editButton(data.position));
      return root;
    }
    const paragraph = element(data.heading ? `h${Math.min(6, data.heading + 2)}` : 'p',
      `para-text${data.heading ? ` heading level-${data.heading}` : ''}`);
    appendText(paragraph, row.parts[side], side);
    if (data.label) {
      const item = element('div', 'list-para');
      item.style.setProperty('--level', data.level);
      item.append(element('span', 'list-label', data.label), paragraph);
      content.append(item);
    } else {
      content.append(paragraph);
    }
    if (side === 'right' && data.target) content.append(editButton(data.position));
    return root;
  }

  root.classList.add('table-row');
  content.classList.add('table-content');
  if (data.number === 1) {
    root.classList.add('table-first');
    content.append(element('div', 'table-caption', data.table));
  }
  if (data.last) root.classList.add('table-last');
  const grid = element('div', `table-cells${data.header ? ' header-row' : ''}`);
  grid.style.gridTemplateColumns = `repeat(${Math.min(120, Math.max(1, data.columns))}, minmax(0, 1fr))`;
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', `${data.table}，第 ${data.number} 行`);
  const formats = data.cells.map(cell => cell.renderIds.map(id => getWordFormat(side, id)).find(Boolean));
  const formatted = formats.find(entry => entry?.table?.columns.length === data.columns);
  const wordTable = formatted && formats.every(format => format?.cell && !format.cell.hidden);
  if (wordTable) {
    content.classList.add('word-row-content');
    grid.classList.add('word-table');
    grid.style.gridTemplateColumns = formatted.table.columns.map(width => `${width}px`).join(' ');
    grid.style.width = `${formatted.table.width}px`;
    if (formatted.table.align === 'center') grid.style.marginInline = 'auto';
    else if (formatted.table.align === 'right') grid.style.marginInlineStart = 'auto';
    else grid.style.marginLeft = `${formatted.table.margin}px`;
  }
  for (const [index, pair] of row.cells.entries()) {
    const cell = pair[side];
    if (!cell) continue;
    const item = element('div', 'table-cell');
    if (data.columns <= 120) item.style.gridColumn = `${cell.column + 1} / span ${cell.span}`;
    if (pair.change) {
      item.dataset.change = pair.change;
      item.append(badge(state.result.changes[pair.change - 1].type, 'margin-label'));
    }
    if (wordTable) {
      const format = cell.renderIds.map(id => getWordFormat(side, id)).find(Boolean);
      setProperties(item, format.cell.properties);
      const vertical = { middle: 'center', bottom: 'end', top: 'start' }[format.cell.vertical];
      if (vertical) item.style.alignContent = vertical;
      let offset = 0;
      for (const [p, value] of cell.paragraphTexts.entries()) {
        const parts = sliceParts(pair.parts[side], offset, value.length);
        const paragraphFormat = getWordFormat(side, cell.renderIds[p]);
        const para = paragraphFormat ? styledParagraph(paragraphFormat, parts, side, { cell: true }) : element('div', 'cell-text');
        if (!paragraphFormat) appendText(para, parts, side);
        item.append(para);
        offset += value.length + 1;
      }
    } else {
      const text = element('div', 'cell-text');
      appendText(text, pair.parts[side], side);
      item.append(text);
    }
    if (side === 'right' && cell.targets.some(Boolean)) item.append(editButton(`${data.table}第 ${data.number} 行，第 ${cell.column + 1} 列`, index));
    grid.append(item);
  }
  if (wordTable) {
    const frame = wordFrame(formatted.page, data.number === 1 ? formatted.table.gapBefore : 0);
    frame.append(grid);
    content.append(frame);
  } else content.append(grid);
  return root;
}

function foldRow(start, end, expanded) {
  const row = element('div', 'doc-row fold-row');
  row.dataset.key = `f${start}`;
  const content = element('div', 'row-content');
  const count = end - start;
  const button = element('button', 'fold-button', expanded ? `收起 ${count} 个相同内容块` : `展开 ${count} 个相同内容块`);
  button.type = 'button';
  button.dataset.fold = start;
  button.setAttribute('aria-expanded', String(expanded));
  content.append(button);
  row.append(content);
  return row;
}

function renderRows(view) {
  const { rows } = state.result;
  const fragments = sides.map(() => document.createDocumentFragment());
  state.rowPairs = [];
  function add(pair) {
    state.rowPairs.push(pair);
    for (const [i, node] of pair.entries()) fragments[i].append(node);
  }
  for (let i = 0; i < rows.length;) {
    if (!$('only').checked || rows[i].changes.length) {
      add(sides.map(side => documentRow(rows[i], side)));
      i++;
      continue;
    }
    let end = i + 1;
    while (end < rows.length && !rows[end].changes.length) end++;
    const expanded = state.expanded.has(i);
    add(sides.map(() => foldRow(i, end, expanded)));
    if (expanded) for (let at = i; at < end; at++) add(sides.map(side => documentRow(rows[at], side)));
    i = end;
  }
  if (!rows.length) fragments.forEach(fragment => fragment.append(element('p', 'empty-list', '这份文档没有可比较的正文。')));
  for (const [i, side] of sides.entries()) $(`${side}-content`).replaceChildren(fragments[i]);
  alignRows();
  updateActive();
  if (view) restoreView(view);
}

function alignRows() {
  if (!state.result) return;
  const selected = $('compare-zoom').value;
  const scales = [];
  for (const side of sides) {
    const scroll = $(`${side}-scroll`);
    const width = state.layouts[side]?.width;
    const zoom = zoomFor(selected, width, scroll.clientWidth - 8, 0.45);
    scales.push(zoom);
    if (scroll.style.getPropertyValue('--word-zoom') !== String(zoom)) scroll.style.setProperty('--word-zoom', zoom);
    const plainZoom = selected === 'fit' ? 1 : zoom;
    if (scroll.style.getPropertyValue('--plain-zoom') !== String(plainZoom)) scroll.style.setProperty('--plain-zoom', plainZoom);
  }
  updateZoomButtons('compare-zoom', scales);
  const heights = state.rowPairs.map(pair => `${Math.ceil(Math.max(...pair.map(node => node.firstElementChild.getBoundingClientRect().height))) + 1}px`);
  state.rowPairs.forEach((pair, i) => pair.forEach(node => { if (node.style.minHeight !== heights[i]) node.style.minHeight = heights[i]; }));
}

function zoomFor(selected, width, available, minimum) {
  if (selected !== 'fit') return Number(selected) / 100;
  return width ? Math.min(1, Math.max(minimum, available / width)) : 1;
}

function fitLayoutPages() {
  if (!$('layout-window').open) return;
  const selected = $('page-zoom').value;
  const scales = [];
  for (const side of sides) {
    const slot = $(`layout-${side}`);
    for (const page of state.layouts[side]?.pages || []) {
      const zoom = zoomFor(selected, page.geometry.width, slot.clientWidth - 20, 0.25);
      page.node.style.zoom = zoom;
      scales.push(zoom);
    }
  }
  updateZoomButtons('page-zoom', scales);
}

function stepZoom(scales, direction) {
  const actual = scales.length ? scales : [1];
  const percent = (direction > 0 ? Math.max(...actual) : Math.min(...actual)) * 100;
  return direction > 0 ? zoomLevels.find(level => level > percent + 0.1)
    : zoomLevels.findLast(level => level < percent - 0.1);
}

function updateZoomButtons(id, scales) {
  $(`${id}-out`).disabled = stepZoom(scales, -1) === undefined;
  $(`${id}-in`).disabled = stepZoom(scales, 1) === undefined;
}

function setupZoom(id, currentScales, applyZoom) {
  const select = $(id);
  for (const level of zoomLevels) select.add(new Option(`${level}%`, String(level)));
  select.addEventListener('change', applyZoom);
  for (const [direction, button] of [[-1, $(`${id}-out`)], [1, $(`${id}-in`)]]) {
    button.addEventListener('click', () => {
      const level = stepZoom(currentScales(), direction);
      if (level === undefined) return;
      select.value = String(level);
      applyZoom();
    });
  }
}

function resizeCompareView() {
  const view = captureView();
  alignRows();
  restoreView(view, true);
  const active = state.active && state.result.changes[state.active - 1];
  if (!active) return;
  for (const side of sides) {
    const pane = $(`${side}-scroll`);
    const row = $(`${side}-content`).querySelector(`[data-row="${active.row}"]`);
    const rectangle = changeTarget(row, active.id)?.getClientRects()[0];
    const bounds = pane.getBoundingClientRect();
    if (rectangle && rectangle.bottom > bounds.top && rectangle.top < bounds.top + pane.clientHeight) revealHorizontally(pane, rectangle, bounds);
  }
}

function resizeOriginalPages() {
  const views = sides.map(side => {
    const slot = $(`layout-${side}`);
    const top = slot.getBoundingClientRect().top;
    const pages = state.layouts[side]?.pages || [];
    const page = pages.find(({ node }) => node.getBoundingClientRect().bottom > top);
    const bounds = page?.node.getBoundingClientRect();
    return { slot, page, left: slot.scrollLeft, top, offset: bounds ? top - bounds.top : 0, height: bounds?.height || 1,
      zoom: Number(page?.node.style.zoom) || 1 };
  });
  fitLayoutPages();
  for (const { slot, page, left, top, offset, height, zoom } of views) {
    if (!page) continue;
    const bounds = page.node.getBoundingClientRect();
    slot.scrollTop += bounds.top - top + (offset < 0 ? offset : offset * bounds.height / height);
    slot.scrollLeft = left * Number(page.node.style.zoom) / zoom;
  }
}

function showOriginalPages() {
  for (const side of sides) {
    const slot = $(`layout-${side}`);
    const file = state.files[side];
    const heading = $(`layout-${side}-name`);
    heading.textContent = `${sideLabels[side]} · ${file.name}`;
    heading.title = file.name;
    slot.replaceChildren(state.layouts[side]?.host || element('p', 'empty-list', '此文件的页式版面未能预览。'));
    slot.scrollTop = 0;
    slot.scrollLeft = 0;
  }
  $('layout-window').showModal();
  fitLayoutPages();
  $('layout-close').focus();
}

function captureView() {
  return sides.map(side => {
    const pane = $(`${side}-scroll`);
    const scrolled = pane.scrollTop;
    const row = Array.from($(`${side}-content`).children).find(node => node.offsetTop + node.offsetHeight > scrolled);
    return { top: scrolled, left: pane.scrollLeft, key: row?.dataset.key, height: row?.offsetHeight || 1,
      zoom: Number(pane.style.getPropertyValue('--word-zoom')) || 1,
      offset: row ? scrolled - row.offsetTop : 0 };
  });
}

function restoreView(view, resized = false) {
  for (const [i, side] of sides.entries()) {
    const pane = $(`${side}-scroll`);
    const saved = view[i];
    const row = saved.key && $(`${side}-content`).querySelector(`[data-key="${saved.key}"]`);
    const offset = row && resized && saved.offset > 0 ? saved.offset * row.offsetHeight / saved.height : saved.offset;
    pane.scrollTop = row ? row.offsetTop + offset : saved.top;
    const scale = resized ? (Number(pane.style.getPropertyValue('--word-zoom')) || 1) / saved.zoom : 1;
    pane.scrollLeft = saved.left * scale;
  }
}

function filtered() {
  const changes = state.result?.changes || [];
  if (state.filter === 'graphic') return changes.filter(change => change.category === 'graphic');
  return state.filter === 'all' ? changes : changes.filter(change => change.type === state.filter);
}

function flat(text) { return text?.replace(/\s+/g, ' ').trim() || ''; }

function snippet(change, side) {
  const row = state.result.rows[change.row];
  const parts = (row.kind === 'table' ? row.cells.find(cell => cell.change === change.id)?.parts : row.parts)?.[side] || [];
  const index = parts.findIndex(part => part.changed && flat(part.text));
  if (index < 0) return flat(side === 'left' ? change.oldText : change.newText).slice(0, 58);
  const before = flat(parts[index - 1]?.text);
  const altered = flat(parts[index].text);
  const after = flat(parts[index + 1]?.text);
  const context = change.type === 'modify' ? 10 : 0;
  return `${before.length > context ? '…' : ''}${context ? before.slice(-context) : ''}${altered.slice(0, 56)}${after.slice(0, context)}${altered.length > 56 || after.length > context ? '…' : ''}`;
}

function locationText(change) {
  const left = change.leftLocation;
  const right = change.rightLocation;
  return left && right && left !== right ? `${left} → ${right}` : right || left;
}

function renderList() {
  const visible = filtered();
  const frag = document.createDocumentFragment();
  state.listButtons.clear();
  $('list-count').textContent = `${visible.length} 处`;
  for (const control of $('filters').querySelectorAll('button')) control.setAttribute('aria-pressed', String(control.dataset.filter === state.filter));
  for (const change of visible) {
    const li = element('li');
    const button = element('button', 'change-item');
    button.type = 'button';
    button.dataset.change = change.id;
    const meta = element('span', 'change-meta');
    const location = locationText(change);
    meta.append(badge(change.type), element('span', 'change-location', location));
    const left = snippet(change, 'left');
    const right = snippet(change, 'right');
    const modified = change.type === 'modify';
    const text = modified ? `${left || '空白'} → ${right || '空白'}` : right || left || '空单元格';
    button.title = [change.section, location, text].filter(Boolean).join(' · ');
    button.append(meta);
    if (change.category === 'graphic') {
      button.append(element('span', 'change-snippet', `${right || left} · ${modified ? '对象内容或属性改变' : labels[change.type]}`));
    } else if (modified) {
      button.append(element('span', 'change-snippet change-before', `− ${left || '空白'}`),
        element('span', 'change-snippet change-after', `+ ${right || '空白'}`));
    } else button.append(element('span', 'change-snippet', text));
    li.append(button);
    frag.append(li);
    state.listButtons.set(change.id, button);
  }
  $('change-list').replaceChildren(frag);
  $('empty-list').hidden = visible.length > 0;
  $('empty-list').textContent = state.result.changes.length ? '没有此类型的差异。' : '在已比较范围内未发现差异。';
  updateActive(visible);
}

function updateActive(visible = filtered()) {
  const active = state.active ? state.result.changes[state.active - 1] : null;
  for (const side of sides) {
    const content = $(`${side}-content`);
    content.querySelectorAll('.is-active').forEach(node => node.classList.remove('is-active'));
    if (active) {
      const row = content.querySelector(`[data-row="${active.row}"]`);
      row?.classList.add('is-active');
      row?.querySelector(`[data-change="${active.id}"]`)?.classList.add('is-active');
    }
  }
  $('change-list').querySelectorAll('[aria-current]').forEach(node => node.removeAttribute('aria-current'));
  if (active) state.listButtons.get(active.id)?.setAttribute('aria-current', 'true');
  const index = visible.findIndex(change => change.id === state.active);
  $('counter').textContent = `${index + 1} / ${visible.length}`;
  $('prev').disabled = index <= 0;
  $('next').disabled = !visible.length || index === visible.length - 1;
}

function changeTarget(row, id) {
  if (!row) return null;
  if (!row.classList.contains('table-row')) return row.querySelector('.mark, .graphic-image, .graphic');
  const cell = row.querySelector(`[data-change="${id}"]`);
  return cell?.querySelector('.mark') || cell;
}

function revealHorizontally(pane, span, paneBounds) {
  if (!span || pane.scrollWidth <= pane.clientWidth) return;
  const left = paneBounds.left + pane.clientLeft + 8;
  const right = left + pane.clientWidth - 16;
  if (span.left < left || span.width > right - left) pane.scrollLeft += span.left - left;
  else if (span.right > right) pane.scrollLeft += span.right - right;
}

function activate(id, revealList = false) {
  const change = state.result?.changes[id - 1];
  if (!change) return;
  state.active = id;
  if (state.filter !== 'all' && !filtered().includes(change)) {
    state.filter = 'all';
    renderList();
  } else updateActive();
  const positions = sides.map(side => {
    const pane = $(`${side}-scroll`);
    const row = $(`${side}-content`).querySelector(`[data-row="${change.row}"]`);
    const bounds = pane.getBoundingClientRect();
    const target = changeTarget(row, id);
    const marker = target?.getClientRects()[0];
    const top = change.type === 'modify' && target?.classList.contains('mark') && marker ? marker.top - bounds.top + pane.scrollTop : null;
    return { pane, row, top, marker, bounds };
  });
  const marked = positions.flatMap(position => position.top === null ? [] : [position.top]);
  const commonTop = marked.length ? Math.min(...marked) : null;
  for (const { pane, row, top, marker, bounds } of positions) {
    if (!row) continue;
    const destination = ($('sync').checked ? commonTop : top ?? commonTop) ?? row.offsetTop;
    pane.scrollTop = Math.max(0, destination - Math.min(65, pane.clientHeight / 5));
    revealHorizontally(pane, marker, bounds);
  }
  const link = state.listButtons.get(id);
  if (revealList && link && !$('changes').hidden) {
    const list = $('change-list');
    const bounds = list.getBoundingClientRect();
    const current = link.getBoundingClientRect();
    if (current.top < bounds.top) list.scrollTop += current.top - bounds.top;
    else if (current.bottom > bounds.bottom) list.scrollTop += current.bottom - bounds.bottom;
  }
}

function move(direction) {
  const changes = filtered();
  const current = changes.findIndex(change => change.id === state.active);
  const target = changes[current + direction];
  if (target) activate(target.id, true);
}

function toggleFilter(filter) {
  if (state.filter === filter) return;
  state.filter = filter;
  if (!filtered().some(change => change.id === state.active)) state.active = null;
  renderList();
}

function handlePaneClick(event, side) {
  const edit = event.target.closest('[data-edit]');
  if (edit && side === 'right') {
    openEditor(Number(edit.closest('[data-row]').dataset.row), edit.dataset.edit);
    return;
  }
  const fold = event.target.closest('[data-fold]');
  if (fold) {
    const view = captureView();
    const key = Number(fold.dataset.fold);
    if (state.expanded.has(key)) state.expanded.delete(key);
    else state.expanded.add(key);
    renderRows(view);
    $(`${side}-content`).querySelector(`[data-fold="${key}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (!window.getSelection()?.isCollapsed) return;
  const row = event.target.closest('[data-row]');
  if (!row) return;
  const cell = event.target.closest('[data-change]');
  const id = Number(cell?.dataset.change) || state.result.rows[Number(row.dataset.row)].changes[0];
  if (id) activate(id, true);
}

function syncFrom(side) {
  if (state.syncing || !$('sync').checked || !state.result) return;
  const source = $(`${side}-scroll`);
  const other = $(side === 'left' ? 'right-scroll' : 'left-scroll');
  if (Math.abs(other.scrollTop - source.scrollTop) < 1) return;
  state.syncing = true;
  other.scrollTop = source.scrollTop;
  cancelAnimationFrame(state.scrollFrame);
  state.scrollFrame = requestAnimationFrame(() => { state.syncing = false; });
}

function updateEditorUI() {
  $('review').classList.toggle('editing', state.editing);
  $('edit-mode').setAttribute('aria-pressed', String(state.editing));
  $('edit-mode').textContent = state.editing ? '结束编辑' : '编辑修订稿';
  $('edit-mode').disabled = state.busy || state.saving;
  $('save-word').disabled = !state.drafts.size || state.busy || state.saving;
  $('save-word').textContent = state.saving ? '正在生成…' : '另存为 Word';
  $('swap').disabled = state.busy || state.saving;
  const edited = state.drafts.size ? `${state.drafts.size} 个段落已修改${unsaved() ? '，可另存为 Word。' : '，已生成 Word 文件。'}` : '';
  const help = state.editing ? '在右侧选择要改的段落或表格单元格。' : '';
  let note = state.feedback || [help, edited].filter(Boolean).join(' ');
  if (state.editor && state.saving) note = '正在生成 Word 文件…';
  $('edit-note').textContent = note;
  $('edit-note').hidden = !note;
  $('edit-note').classList.toggle('failed', state.feedback.startsWith('未能'));
}

function openEditor(rowNumber, column) {
  if (!state.editing || state.busy || state.saving) return;
  const row = state.result.rows[rowNumber];
  const cell = column === '' ? null : row.cells[Number(column)];
  const targets = cell ? cell.right.targets : [row.right.target];
  const values = cell ? cell.right.paragraphTexts : [row.right.text];
  const counterpart = cell ? cell.left?.paragraphTexts : row.left ? [row.left.text] : null;
  if (!targets.some(Boolean)) return;
  const position = cell ? `${row.right.table} · 第 ${row.right.number} 行，第 ${cell.right.column + 1} 列` : row.right.position;
  $('editor-location').textContent = position;
  $('editor-error').hidden = true;
  const fields = document.createDocumentFragment();
  const inputs = targets.map((target, i) => {
    const item = element('label', 'editor-field');
    if (targets.length > 1 || !target) item.append(element('span', 'editor-field-label', `段落 ${i + 1}${target ? '' : ' · 结构受限'}`));
    const input = element('textarea');
    input.rows = Math.min(9, Math.max(3, Math.ceil(values[i].length / 45)));
    input.value = values[i];
    input.readOnly = !target;
    input.setAttribute('aria-label', targets.length > 1 ? `段落 ${i + 1}` : '修订稿文字');
    item.append(input);
    fields.append(item);
    return input;
  });
  const adoptable = counterpart?.length === values.length && counterpart.some((text, i) => text !== values[i]) &&
    counterpart.every((text, i) => text === values[i] || (targets[i] && canRepresentText(text)));
  state.editor = { targets, inputs, counterpart: adoptable ? counterpart : null };
  $('editor-fields').replaceChildren(fields);
  $('take-original').hidden = !adoptable;
  $('reset-editor').hidden = targets.every(target => !target || !state.drafts.has(target.id));
  $('editor').showModal();
  const current = inputs.find(input => !input.readOnly);
  current.focus();
  current.setSelectionRange(0, 0);
}

function applyEditor() {
  const { targets, inputs } = state.editor;
  const values = inputs.map(input => input.value);
  if (values.some((value, i) => targets[i] && !canRepresentText(value))) {
    $('editor-error').textContent = '请在原段落内改文字。新增换行、制表符和控制字符无法在此处保存。';
    $('editor-error').hidden = false;
    return;
  }
  const before = draftSignature();
  for (const [i, target] of targets.entries()) {
    if (!target) continue;
    if (values[i] === target.text) state.drafts.delete(target.id);
    else state.drafts.set(target.id, { original: target.text, text: values[i] });
  }
  $('editor').close();
  state.feedback = '';
  updateEditorUI();
  if (draftSignature() !== before) compare(true);
}

async function saveEditedWord() {
  if (state.saving || state.busy || !state.drafts.size) return;
  if (state.loaded.right.signed && !window.confirm('这份 Word 带数字签名。更改正文后，原签名可能失效。仍要另存吗？')) return;
  state.saving = true;
  state.feedback = '';
  updateEditorUI();
  try {
    const right = state.files.right;
    const version = draftSignature();
    const output = await exportDocument(right, state.loaded.right, new Map(state.drafts));
    const name = `${right.name.replace(/\.docx$/i, '')}_编辑版.docx`;
    const url = URL.createObjectURL(output);
    const link = element('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    state.saved = version;
    state.feedback = `已生成 ${name}，可在浏览器的下载列表查看。`;
  } catch (error) {
    console.error(error);
    state.feedback = '未能生成 Word 文件，本次修改仍保留在页面中。';
  } finally {
    state.saving = false;
    updateEditorUI();
  }
}

for (const side of sides) {
  const input = $(`${side}-file`);
  const card = $(`${side}-card`);
  input.addEventListener('change', () => { choose(side, input.files[0]); input.value = ''; });
  card.addEventListener('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    card.classList.add('dragging');
  });
  card.addEventListener('dragleave', event => { if (!card.contains(event.relatedTarget)) card.classList.remove('dragging'); });
  card.addEventListener('drop', event => {
    event.preventDefault();
    card.classList.remove('dragging');
    if (event.dataTransfer.files.length > 1 && (event.dataTransfer.files.length !== 2 || state.files.left || state.files.right)) {
      status('每个区域一次接收一份文件。请将原稿和修订稿分别拖入对应区域。', true);
      return;
    }
    if (event.dataTransfer.files.length === 2) {
      if (choose('left', event.dataTransfer.files[0])) choose('right', event.dataTransfer.files[1]);
    } else choose(side, event.dataTransfer.files[0]);
  });
  $(`${side}-scroll`).addEventListener('scroll', () => syncFrom(side), { passive: true });
  $(`${side}-content`).addEventListener('click', event => handlePaneClick(event, side));
}

window.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
window.addEventListener('drop', event => { if (event.dataTransfer?.files.length) event.preventDefault(); });
$('start').addEventListener('click', () => compare());
$('demo').addEventListener('click', () => {
  if (choose('left', demoFile(false)) && choose('right', demoFile(true))) compare();
});
$('swap').addEventListener('click', () => {
  if (state.busy || !discardDrafts()) return;
  [state.files.left, state.files.right] = [state.files.right, state.files.left];
  clearResult();
  updateFiles();
  compare();
});
$('marking').addEventListener('change', event => {
  const view = captureView();
  $('review').dataset.marking = event.target.value;
  alignRows();
  restoreView(view);
});
$('sync').addEventListener('change', () => { if ($('sync').checked) syncFrom('left'); });
$('only').addEventListener('change', () => {
  const view = captureView();
  state.expanded.clear();
  renderRows(view);
  if (state.active) activate(state.active);
});
$('show-list').addEventListener('click', () => {
  const view = captureView();
  const hidden = !$('changes').hidden;
  $('changes').hidden = hidden;
  $('review').classList.toggle('list-closed', hidden);
  $('show-list').setAttribute('aria-expanded', String(!hidden));
  alignRows();
  restoreView(view);
});
$('filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (button) toggleFilter(button.dataset.filter);
});
$('change-list').addEventListener('click', event => {
  const button = event.target.closest('[data-change]');
  if (button) activate(Number(button.dataset.change));
});
$('prev').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));
$('edit-mode').addEventListener('click', () => {
  const view = captureView();
  state.editing = !state.editing;
  state.feedback = '';
  updateEditorUI();
  alignRows();
  restoreView(view);
});
$('editor-close').addEventListener('click', () => $('editor').close());
$('editor').addEventListener('close', () => { state.editor = null; });
$('take-original').addEventListener('click', () => {
  state.editor.inputs.forEach((input, i) => { if (!input.readOnly) input.value = state.editor.counterpart[i]; });
});
$('reset-editor').addEventListener('click', () => {
  state.editor.inputs.forEach((input, i) => { if (!input.readOnly) input.value = state.editor.targets[i].text; });
});
$('apply-editor').addEventListener('click', applyEditor);
$('save-word').addEventListener('click', saveEditedWord);
$('show-layout').addEventListener('click', showOriginalPages);
$('layout-close').addEventListener('click', () => $('layout-window').close());
$('layout-window').addEventListener('close', () => sides.forEach(side => $(`layout-${side}`).replaceChildren()));
window.addEventListener('beforeunload', event => {
  if (unsaved()) { event.preventDefault(); event.returnValue = true; }
});

if ('ResizeObserver' in window) {
  let width = 0;
  const observer = new ResizeObserver(entries => {
    const next = entries[0].contentRect.width;
    if (next === width) return;
    width = next;
    alignRows();
  });
  observer.observe($('left-scroll'));
  const pageObserver = new ResizeObserver(fitLayoutPages);
  pageObserver.observe($('layout-left'));
} else window.addEventListener('resize', () => { alignRows(); fitLayoutPages(); });

setupZoom('compare-zoom', () => sides.map(side => Number($(`${side}-scroll`).style.getPropertyValue('--word-zoom')) || 1), resizeCompareView);
setupZoom('page-zoom', () => sides.flatMap(side => (state.layouts[side]?.pages || []).map(page => Number(page.node.style.zoom) || 1)), resizeOriginalPages);

updateFiles();
updateEditorUI();
