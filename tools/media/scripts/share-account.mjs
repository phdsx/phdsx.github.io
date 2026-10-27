import {extractShareUrl, analyzeShareUrls, profileFor} from './share-account-core.mjs';

const $ = id => document.getElementById(id);
let generation = 0;
let activeRequest;
let report = '';
const verdicts = {
  identified: ['已解析分享人 UID', '找到链接中的分享人账号', '账号来自 activity_info.social_share_user_id。公开主页会按这个 UID 查询；再次转发可能保留原分享人。'],
  conflict: ['分享人字段冲突', '发现多个不同的分享人 UID', '这些链接或重复参数携带不同账号，暂不自动选择或查询主页，请核对字段来源。'],
  candidate: ['发现候选账号', '找到待核验的分享账号字段', '下面的值来自链接参数，尚未经过平台身份核验，不能证明当前发送人的身份。'],
  clues: ['发现分享线索', '暂无法确认分享人账号', '链接保留了分享追踪字段，但这些字段没有可供本工具可靠还原账号的映射。'],
  short: ['需要展开短链接', '短码本身无法识别账号', '可关闭“仅本地分析”后重试，或补充跳转后的抖音长链接。'],
  unavailable: ['未发现分享人字段', '无法从此链接确认分享人', '链接可能只包含视频或主页信息。内容作者、被分享的主页账号都不等于分享人。']
};
if (location.protocol === 'file:') {
  $('file-help').hidden = false;
  $('local-only').checked = true;
  $('local-only').disabled = true;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, href) {
  const node = element('a', text);
  node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}
function status(text, error = false) { $('status').textContent = text; $('status').dataset.error = String(error); }
function invalidate() {
  generation++; activeRequest?.abort(); activeRequest = null;
  $('analyze').disabled = false; $('analyze').textContent = '识别账号线索 ↗';
  $('result').hidden = true; report = '';
  for (const id of ['account-list', 'fields', 'chain', 'video-line', 'result-tag', 'result-heading', 'result-description', 'field-count', 'hop-count']) $(id).replaceChildren();
}
for (const id of ['share-input', 'expanded-input', 'local-only']) $(id).addEventListener(id === 'local-only' ? 'change' : 'input', () => { invalidate(); status('输入已更新，请重新识别。'); });

function render(result, chain, notice, profile = null) {
  const [tag, heading, description] = verdicts[result.state];
  $('result-tag').textContent = tag; $('result-heading').textContent = heading; $('result-description').textContent = description;
  $('verdict').dataset.state = result.state;
  $('account-list').replaceChildren(); $('fields').replaceChildren(); $('chain').replaceChildren(); $('video-line').replaceChildren();
  for (const uid of result.sharers) {
    const box = element('div', undefined, 'sharer-account');
    const matched = result.state === 'identified' && profile?.uid === uid && profileFor('sec_uid', profile.secUid);
    box.append(element('strong', '分享人 UID'), element('p', uid, 'account-uid'));
    if (matched) {
      if (profile.nickname) box.append(element('p', '昵称：' + profile.nickname));
      if (profile.handle) box.append(element('p', '抖音号：' + profile.handle));
      box.append(link('打开分享人公开主页 ↗', matched));
      box.append(element('p', '公开接口返回的 UID 与链接中分享人 UID 一致。', 'help'));
    } else box.append(element('p', result.state === 'conflict' ? '存在冲突，未查询主页。' : 'UID 已解析；公开主页尚未取得。', 'help'));
    $('account-list').append(box);
  }
  for (const candidate of result.candidates) {
    const box = element('div', undefined, 'candidate');
    box.append(element('strong', candidate.key), element('p', candidate.value), element('p', '候选值 · 未核验，可能属于更早的分享来源'));
    if (candidate.profile) box.append(link('打开候选主页核对 ↗', candidate.profile));
    $('account-list').append(box);
  }
  for (const id of result.videos) {
    const row = element('p'); row.append(element('span', '作品 ID：' + id + ' · '), link('查看作品 ↗', 'https://www.douyin.com/video/' + id));
    $('video-line').append(row);
  }
  if (!result.fields.length) $('fields').append(element('p', '没有发现可解析的查询参数。', 'help'));
  // Put identity-related evidence first, while retaining every raw parameter.
  const order = ['sharer', 'candidate', 'account', 'profile', 'author', 'tracking', 'device', 'other'];
  for (const field of [...result.fields].sort((a,b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
    const row = element('div', undefined, 'field');
    const head = element('div', undefined, 'field-head');
    head.append(element('code', field.key), element('span', field.label + ' · 链接 ' + field.source));
    row.append(head, element('div', field.value || '（空值）', 'field-value'), element('p', field.note));
    if (field.profile) row.append(link('打开该字段指向的主页 ↗', field.profile));
    $('fields').append(row);
  }
  chain.forEach((hop, index) => {
    const row = element('li'); row.append(element('code', `${hop.manual ? '手动补充 · 关联未验证' : '链接 ' + (index + 1)}${hop.status ? ' · HTTP ' + hop.status : ''}`), link(hop.url, hop.url));
    $('chain').append(row);
  });
  $('field-count').textContent = result.fields.length + ' 项'; $('hop-count').textContent = chain.length + ' 条';
  $('result').hidden = false; $('verdict').focus({preventScroll: true});
  $('result').scrollIntoView({block: 'start'});
  status(notice);
  report = ['分享链接账号识别', heading, description, '链接中的分享人 UID：' + (result.sharers.join('、') || '未取得'), '以上账号不证明当前发送人的身份。', ...(profile ? ['公开主页：' + profileFor('sec_uid', profile.secUid), '昵称：' + profile.nickname, '抖音号：' + profile.handle] : []), notice, '', ...result.fields.map(f => `[链接 ${f.source}] ${f.key} = ${f.value}\n${f.label}：${f.note}`), '', '跳转链（手动补充的链接关联未验证）：', ...chain.map(h => `${h.manual ? '[手动补充] ' : ''}${h.url}`)].join('\n');
}

async function apiPost(payload) {
  const response = await fetch('/tools/media/share-account/api/resolve', {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), signal: AbortSignal.any([activeRequest.signal, AbortSignal.timeout(20000)])});
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('本站未连接账号解析服务。');
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || '解析服务暂时不可用。');
  return body;
}

$('analyze').addEventListener('click', async () => {
  invalidate(); const run = generation;
  try {
    const initial = extractShareUrl($('share-input').value);
    const expanded = $('expanded-input').value.trim() ? extractShareUrl($('expanded-input').value) : null;
    activeRequest = new AbortController();
    let chain = [{url: initial, status: null}];
    let notice = '已完成本地分析，未请求抖音页面。';
    if (new URL(initial).hostname === 'v.douyin.com' && !$('local-only').checked) {
      $('analyze').disabled = true; $('analyze').textContent = '正在展开…'; status('正在展开短链接，保留各级跳转参数…');
      try {
        const body = await apiPost({input: initial});
        if (!Array.isArray(body.chain) || !body.chain.length || body.chain.length > 7) throw new Error('解析服务未返回有效跳转链。');
        analyzeShareUrls(body.chain.map(hop => hop.url));
        chain = body.chain; notice = body.message || '已保留跳转链。';
      } catch (error) {
        if (run !== generation) return;
        notice = (error.name === 'TimeoutError' ? '展开短链接超时。' : error.message || '短链接解析失败。') + ' 已保留本地结果；可补充跳转后的长链接。';
      }
    }
    if (run !== generation) return;
    if (expanded && !chain.some(h => h.url === expanded)) { chain.push({url: expanded, status: null, manual: true}); notice += ' 包含手动补充地址，其与原链接的关系未验证。'; }
    const analysis = analyzeShareUrls(chain.map(hop => hop.url));
    let profile = null;
    if (analysis.state === 'identified' && !$('local-only').checked) {
      $('analyze').disabled = true; $('analyze').textContent = '正在查询主页…'; status('已解析分享人 UID，正在匹配公开主页…');
      try {
        const body = await apiPost({operation: 'profile', uid: analysis.sharers[0]});
        if (body.profile?.uid !== analysis.sharers[0] || !profileFor('sec_uid', body.profile?.secUid)) throw new Error('公开主页未匹配到相同 UID。');
        profile = body.profile; notice += ' 已按分享人 UID 取得公开主页。';
      } catch (error) {
        if (run !== generation) return;
        notice += ' ' + (error.name === 'TimeoutError' ? '公开主页查询超时。' : error.message || '公开主页暂时不可用。') + ' 已保留分享人 UID。';
      }
    }
    if (run !== generation) return;
    render(analysis, chain, notice, profile);
  } catch (error) { if (run === generation) status(error.message, true); }
  finally { if (run === generation) { $('analyze').disabled = false; $('analyze').textContent = '识别账号线索 ↗'; activeRequest = null; } }
});
$('clear').addEventListener('click', () => { invalidate(); $('share-input').value = ''; $('expanded-input').value = ''; status('已清空输入和结果。'); $('share-input').focus(); });
$('sample').addEventListener('click', () => {
  invalidate();
  const sample = new URL('https://www.iesdouyin.com/share/video/7000000000000000000/');
  sample.searchParams.set('activity_info', JSON.stringify({social_share_user_id: '10000000001', social_author_id: '20000000002', social_share_time: '1792944000'}));
  sample.searchParams.set('u_code', 'demo_share_code'); sample.searchParams.set('did', 'demo_device');
  $('share-input').value = '演示数据（非真实账号）：' + sample.href;
  $('local-only').checked = true; $('expanded-input').value = '';
  status('已载入虚构示例，并开启仅本地分析，不会查询示例账号。点击识别，查看分享人 UID 与作者的区别。'); $('share-input').focus();
});
$('copy-report').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(report); status('报告已复制，包含链接原始参数。'); }
  catch { status('浏览器未允许复制，请手动选择结果文字复制。', true); }
});
