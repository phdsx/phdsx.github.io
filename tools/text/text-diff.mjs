import { RULES, validateText, equalityMessage, paginateRows, makeReport } from './text-diff-core.mjs';

const $ = id => document.getElementById(id);
const original = $('original'), comparison = $('comparison'), whitespace = $('whitespace');
const output = $('diff-output');
let worker = null, watchdog = null, revision = 0, result = null, pages = [], currentPage = 0, currentBlock = -1;

function notify(message, error = false) {
  $('status').textContent = message;
  $('status').dataset.error = String(error);
}

function stopWorker() {
  worker?.terminate(); worker = null;
  clearTimeout(watchdog); watchdog = null;
  $('compare').disabled = false;
  $('cancel').hidden = true;
  $('result').setAttribute('aria-busy', 'false');
}

function blankOutput(message) {
  const empty = document.createElement('p'); empty.className = 'diff-empty'; empty.textContent = message;
  output.replaceChildren(empty);
}

function invalidate(message = '文本或规则已变化，请重新点击“开始比对”。') {
  revision++; stopWorker();
  result = null; pages = []; currentPage = 0; currentBlock = -1;
  $('download').disabled = true;
  $('previous-diff').disabled = $('next-diff').disabled = true;
  $('pager').hidden = true;
  $('summary').textContent = '等待重新比对';
  $('result-rule').textContent = '';
  $('diff-position').textContent = '0 / 0 处';
  blankOutput('当前输入尚未比对。');
  originalCount();
  notify(message);
}

function originalCount() {
  $('original-count').textContent = `${original.value.length.toLocaleString('en-US')} 个字符单位`;
  $('comparison-count').textContent = `${comparison.value.length.toLocaleString('en-US')} 个字符单位`;
}

function ruleDescription() {
  const rule = RULES[whitespace.value];
  $('rule-description').textContent = `当前规则：${rule.label}。${rule.description}`;
}

function visibleWhitespace(text) {
  if (!$('show-whitespace').checked) return text;
  return text.replace(/[\p{White_Space}\uFEFF]/gu, char => char === ' ' ? '·' : char === '\t' ? '⇥' : char === '\u3000' ? '□' : char === '\r' ? '␍' : '⍽');
}

function makeCell(side, name, kind) {
  const cell = document.createElement('div'); cell.className = 'diff-cell';
  cell.dataset.kind = side ? kind : 'equal';
  const number = document.createElement('span'); number.className = 'diff-line-number';
  number.textContent = side ? String(side.number) : '—'; number.dataset.side = name;
  number.setAttribute('aria-label', `${name}文本${side ? `第 ${side.number} 行` : '无对应行'}`);
  const badge = document.createElement('span'); badge.className = 'diff-kind';
  badge.textContent = !side ? '—' : ({ equal: '相同', add: '＋新增', delete: '−删除', modify: '↔修改' })[kind];
  const text = document.createElement('pre'); text.className = 'diff-text'; text.setAttribute('translate', 'no');
  if (!side || side.text === '') {
    const empty = document.createElement('span'); empty.className = side ? 'diff-empty-line' : 'diff-absent';
    empty.textContent = side ? '〔空行〕' : '〔无对应行〕'; text.append(empty);
  } else {
    for (const part of side.segments) {
      // CODE is also excluded by the site's automatic language translator.
      // textContent keeps HTML/script literal; no user input enters innerHTML.
      const token = document.createElement('code'); token.className = `diff-token ${part.kind}`;
      token.textContent = visibleWhitespace(part.text); text.append(token);
    }
  }
  cell.append(number, badge, text);
  return cell;
}

function updateNavigation() {
  const count = result?.blocks.length || 0;
  $('diff-position').textContent = `${count ? currentBlock + 1 : 0} / ${count} 处`;
  $('previous-diff').disabled = $('next-diff').disabled = count < 2;
}

function renderPage() {
  if (!result) return;
  const page = pages[currentPage];
  if (!page) { blankOutput('两侧都是空文本。'); return; }
  const fragment = document.createDocumentFragment();
  for (let index = page.start; index < page.end; index++) {
    const row = result.rows[index];
    const node = document.createElement('div'); node.className = 'diff-row'; node.dataset.row = String(index);
    if (row.block !== null) {
      node.dataset.block = String(row.block); node.tabIndex = -1;
      if (row.block === currentBlock) node.classList.add('current');
      node.setAttribute('aria-label', `差异块 ${row.block + 1}，${({ add: '新增', delete: '删除', modify: '修改' })[row.kind]}`);
    }
    node.append(makeCell(row.left, '原始', row.kind), makeCell(row.right, '对比', row.kind));
    fragment.append(node);
  }
  output.replaceChildren(fragment);
  $('pager').hidden = pages.length < 2;
  $('page-position').textContent = `第 ${currentPage + 1} / ${pages.length} 页 · 对齐行 ${page.start + 1}–${page.end} / ${result.rows.length}`;
  $('previous-page').disabled = currentPage === 0;
  $('next-page').disabled = currentPage === pages.length - 1;
  updateNavigation();
}

function navigateDiff(direction) {
  if (!result?.blocks.length) return;
  currentBlock = (currentBlock + direction + result.blocks.length) % result.blocks.length;
  const row = result.blocks[currentBlock].start;
  currentPage = pages.findIndex(page => row >= page.start && row < page.end);
  renderPage();
  const target = output.querySelector(`[data-row="${row}"]`);
  target?.focus({ preventScroll: true });
  if (target) output.scrollTop = target.offsetTop - output.offsetTop - 8;
}

function showResult(next) {
  result = next;
  pages = paginateRows(result.rows); currentPage = 0; currentBlock = result.blocks.length ? 0 : -1;
  $('download').disabled = false;
  $('summary').textContent = result.identical ? equalityMessage(result) : `${result.blocks.length} 个差异块 · 新增 ${result.stats.added} 行 · 删除 ${result.stats.deleted} 行 · 修改 ${result.stats.modified} 行`;
  $('result-rule').textContent = `${result.rule === 'none' ? '比对结果（换行已统一）' : '处理后的比对结果'} · 当前规则：${RULES[result.rule].label}。输入框中的原文保持不变。`;
  renderPage(); updateNavigation();
  notify('比对完成。差异报告包含全部结果，分页仅影响页面显示。');
  $('summary').focus({ preventScroll: true });
}

function fail(message) {
  stopWorker();
  $('summary').textContent = '比对未完成';
  blankOutput('尚未生成完整结果，请按提示调整后重试。');
  notify(message, true);
}

function compare() {
  invalidate('正在浏览器本地计算…');
  try {
    validateText(original.value, '原始文本'); validateText(comparison.value, '对比文本');
    if (typeof Worker !== 'function' || typeof Intl.Segmenter !== 'function') throw new Error('此工具需要 Web Worker 和 Unicode 字素分割支持。请通过网站使用新版浏览器。');
    const id = revision;
    worker = new Worker(new URL('./text-diff-worker.mjs', import.meta.url), { type: 'module' });
    $('compare').disabled = true; $('cancel').hidden = false;
    $('result').setAttribute('aria-busy', 'true'); $('summary').textContent = '正在计算…';
    worker.onmessage = ({ data }) => {
      if (data.id !== revision) return;
      stopWorker();
      if (data.error) fail(data.error); else showResult(data.result);
    };
    worker.onerror = event => {
      event.preventDefault();
      fail('比对模块加载失败。请通过 HTTP/HTTPS 打开页面并刷新后重试。');
    };
    watchdog = setTimeout(() => fail('计算超过 12 秒，已取消。请分段比对；尚未生成完整结果。'), 12000);
    worker.postMessage({ id, original: original.value, comparison: comparison.value, rule: whitespace.value });
  } catch (error) { fail(error.message); }
}

async function copyText(input, name) {
  // Capture at click time, even if the input changes while permission is pending.
  const text = input.value;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('剪贴板不可用');
    await navigator.clipboard.writeText(text);
    notify(`已复制${name}原文。`);
  } catch {
    input.focus(); input.select();
    notify(`复制${name}失败，已选中文本。请按 Ctrl+C（Mac 使用 ⌘C）手动复制。`, true);
  }
}

function download() {
  if (!result) return;
  let url;
  try {
    url = URL.createObjectURL(new Blob(['\uFEFF', makeReport(result)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '文本差异比对报告.txt';
    document.body.append(link); link.click(); link.remove();
    notify('已生成完整 TXT 差异报告并开始下载，请查看浏览器下载列表。');
  } catch { notify('报告生成或下载失败，请检查浏览器的下载权限后重试。', true); }
  finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

original.addEventListener('input', () => invalidate());
comparison.addEventListener('input', () => invalidate());
whitespace.addEventListener('change', () => { ruleDescription(); invalidate(); });
$('show-whitespace').addEventListener('change', () => { renderPage(); notify('已更新空白符显示；比较内容与规则保持不变。'); });
$('compare').addEventListener('click', compare);
$('cancel').addEventListener('click', () => invalidate('计算已取消，输入文本保留。'));
$('clear-original').addEventListener('click', () => { original.value = ''; invalidate('已清空原始文本，请重新比对。'); original.focus(); });
$('clear-comparison').addEventListener('click', () => { comparison.value = ''; invalidate('已清空对比文本，请重新比对。'); comparison.focus(); });
$('clear-all').addEventListener('click', () => { original.value = comparison.value = ''; invalidate('已清空两侧文本及比对结果。'); original.focus(); });
$('swap').addEventListener('click', () => { [original.value, comparison.value] = [comparison.value, original.value]; invalidate('已交换两侧原文，请重新比对。'); });
$('sample').addEventListener('click', () => {
  original.value = '项目说明\n今天学习文本比对。\n保留这一行\n这行将在新版删除\n重复段落\n重复段落\n  空格 测试\t完成  \nEnglish 123，Emoji 👩🏽‍💻！\n共同结尾';
  comparison.value = '项目说明\n今天学习文本差异比对！\n保留这一行\n重复段落\n重复段落\n空格  测试\t完成\nEnglish 124，Emoji 👨‍💻！\n新增中文行\n新增第二行\n共同结尾';
  whitespace.value = 'none'; ruleDescription(); invalidate('已载入包含中文、重复行、增删修改和空白差异的示例。点击“开始比对”。');
});
$('copy-original').addEventListener('click', () => copyText(original, '原始文本'));
$('copy-comparison').addEventListener('click', () => copyText(comparison, '对比文本'));
$('download').addEventListener('click', download);
$('previous-diff').addEventListener('click', () => navigateDiff(-1));
$('next-diff').addEventListener('click', () => navigateDiff(1));
$('previous-page').addEventListener('click', () => { if (result && currentPage > 0) { currentPage--; renderPage(); output.scrollTop = 0; } });
$('next-page').addEventListener('click', () => { if (result && currentPage < pages.length - 1) { currentPage++; renderPage(); output.scrollTop = 0; } });
window.addEventListener('pagehide', () => stopWorker());
ruleDescription(); originalCount();
