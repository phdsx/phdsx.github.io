import { validateFile } from './shutter-count-core.mjs';

const $ = id => document.getElementById(id);
let worker, timer, currentFile, report = '', generation = 0;
function stop() {
  generation++;
  worker?.terminate(); worker = null;
  clearTimeout(timer);
  $('cancel').hidden = true;
  $('result-panel').setAttribute('aria-busy', 'false');
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function clearResult() {
  report = '';
  $('result').hidden = true;
  $('empty').hidden = false;
  $('copy').textContent = '复制读取报告';
}
function display(result) {
  const primary = result.counters[0];
  $('empty').hidden = true; $('result').hidden = false;
  $('count').textContent = primary ? primary.value.toLocaleString('zh-CN') : '未找到计数';
  $('count').classList.toggle('missing', !primary);
  $('counter-label').textContent = primary?.label || '照片中没有可读取的快门字段';
  const explanation = !primary
    ? '这不代表快门次数为 0。请换用未编辑的 RAW 原片；该机型也可能没有在照片中记录计数。'
    : primary.tag === 'MechanicalShutterCount'
      ? '这是照片记录的机械快门计数。若还记录了总计数，会在下方分别列出。'
      : primary.tag === 'ImageCount'
        ? '这是图像计数，不能直接视为机械快门次数。部分机型可能因固件升级或维修而重置。'
        : '这是厂商记录的快门计数。是否包含电子快门因机型而异，不代表剩余可拍次数。';
  $('explanation').textContent = explanation;
  $('camera-details').replaceChildren();
  const details = [['品牌', result.make], ['型号', result.model], ['镜头', result.lens], ['拍摄时间', result.date], ['文件格式', result.type]];
  for (const [label, value] of details) {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value || '未记录'; row.append(dt, dd); $('camera-details').append(row);
  }
  $('counter-list').replaceChildren();
  for (const counter of result.counters) {
    const row = document.createElement('div'), label = document.createElement('span'), source = document.createElement('small'), value = document.createElement('strong');
    row.className = 'shutter-counter'; label.textContent = counter.label; source.textContent = counter.key;
    label.append(source); value.textContent = counter.value.toLocaleString('zh-CN'); row.append(label, value); $('counter-list').append(row);
  }
  $('warnings').hidden = !result.warnings.length;
  $('warnings').textContent = result.warnings.length ? '解析提示：' + result.warnings.join('；') : '';
  report = ['相机快门次数读取报告', '文件：' + currentFile.name, ...details.map(([key, value]) => `${key}：${value || '未记录'}`),
    ...result.counters.map(c => `${c.label}：${c.value}（${c.key}）`), explanation,
    ...result.warnings, `解析器：ExifTool ${result.engine}`, '仅反映这张照片拍摄时的记录；照片未上传。'].join('\n');
  status(primary ? '读取完成。结果对应这张照片拍摄时的记录。' : '读取完成，但没有找到可用的快门计数。');
}
function read(file) {
  stop(); clearResult();
  $('photo-file').value = '';
  $('reset').hidden = false;
  currentFile = file;
  $('file-info').hidden = !file;
  $('file-info').textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MiB` : '';
  const error = validateFile(file);
  if (error) { status(error, true); return; }
  if (!window.Worker || !window.WebAssembly) { status('此浏览器不支持本地解析，请使用新版 Chrome、Edge、Firefox 或 Safari。', true); return; }
  const token = generation;
  $('cancel').hidden = false;
  $('result-panel').setAttribute('aria-busy', 'true');
  status('正在加载解析器并读取照片，请稍候。照片留在本机，可以随时取消。');
  const fail = message => { if (token !== generation) return; stop(); status(message, true); };
  try {
    worker = new Worker(new URL('./shutter-count-worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (token !== generation || data.stage) return;
      if (data.error) { fail(data.error); return; }
      stop(); display(data.result);
    };
    worker.onerror = () => fail('解析器加载失败。请检查网络，或使用新版浏览器重试。');
    worker.onmessageerror = () => fail('照片传递失败，请重新选择文件。');
    timer = setTimeout(() => fail('读取超时，请换一张较小的原片后重试。'), 90000);
    worker.postMessage(file);
  } catch { fail('无法启动本地解析器，请通过网站地址打开本工具并重试。'); }
}
$('choose').addEventListener('click', () => $('photo-file').click());
$('photo-file').addEventListener('change', event => { if (event.target.files[0]) read(event.target.files[0]); });
$('cancel').addEventListener('click', () => { stop(); status('已取消读取，可以重新选择照片。'); });
$('reset').addEventListener('click', () => {
  stop(); clearResult(); currentFile = null; $('photo-file').value = '';
  $('file-info').hidden = true; $('reset').hidden = true; status('已清除。可以选择另一张原片。');
});
for (const name of ['dragenter', 'dragover']) $('drop-zone').addEventListener(name, event => { event.preventDefault(); $('drop-zone').classList.add('dragging'); });
$('drop-zone').addEventListener('dragleave', event => { if (!$('drop-zone').contains(event.relatedTarget)) $('drop-zone').classList.remove('dragging'); });
// Prevent dropped files outside the target from navigating away from the tool.
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => {
  event.preventDefault(); $('drop-zone').classList.remove('dragging');
  if (!$('drop-zone').contains(event.target)) return;
  const files = event.dataTransfer.files;
  if (files.length !== 1) { stop(); clearResult(); status('请一次选择一张照片。', true); return; }
  read(files[0]);
});
$('copy').addEventListener('click', async () => {
  const copiedReport = report;
  try {
    await navigator.clipboard.writeText(copiedReport);
    if (report === copiedReport) status('读取报告已复制。');
  } catch { status('复制失败，请手动选择并复制结果。', true); }
});
window.addEventListener('pagehide', stop);
