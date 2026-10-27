// URL evidence only. No field in this module authenticates a human sender.
export const DOUYIN_HOSTS = new Set(['douyin.com', 'www.douyin.com', 'v.douyin.com', 'iesdouyin.com', 'www.iesdouyin.com']);
export const INPUT_LIMIT = 8192;

export function validateDouyinUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('链接格式不正确，请粘贴完整的抖音分享链接。'); }
  if (url.protocol !== 'https:' || !DOUYIN_HOSTS.has(url.hostname) || url.username || url.password || url.port || url.href.length > INPUT_LIMIT) {
    throw new Error('当前仅支持 HTTPS 抖音链接（douyin.com / iesdouyin.com），不支持其他域名。');
  }
  url.hash = '';
  return url;
}

export function extractShareUrl(input) {
  const text = String(input ?? '').trim();
  if (!text || text.length > INPUT_LIMIT) throw new Error('请粘贴分享链接或完整分享文案，最多 8,192 个字符。');
  const matches = text.match(/https?:\/\/[^\s<>“”「」]+/gi) || [];
  if (matches.length !== 1) throw new Error(matches.length ? '检测到多条链接，请每次只解析一条，避免混淆账号来源。' : '没有找到链接，请粘贴包含 https:// 的完整分享文案。');
  return validateDouyinUrl(matches[0].replace(/[。，、！!？）)；;"']+$/u, '')).href;
}

const explicitSharer = new Set(['share_uid', 'share_user_id', 'sharer_uid', 'share_sec_uid', 'share_sec_user_id']);
const account = new Set(['sec_uid', 'sec_user_id', 'uid', 'user_id']);
const author = new Set(['author_id', 'author_user_id', 'author_sec_uid']);
const tracking = new Set(['u_code', 'share_id', 'share_link_id', 'share_sign', 'share_token', 'share_track_info', 'share_video_id', 'share_item_id']);
const device = new Set(['did', 'sec_did', 'iid', 'device_id', 'install_id', 'with_sec_did']);

function describe(key) {
  if (key === 'activity_info') return ['tracking', '分享活动信息', '展开 JSON 中的 social_share_user_id 读取分享人 UID；social_author_id 单独表示作者。'];
  if (explicitSharer.has(key)) return ['candidate', '待核验的分享账号字段', '字段名指向分享账号；参数可修改，也可能保留更早的分享来源，不能证明当前发送人身份。'];
  if (account.has(key)) return ['account', '归属不明的账号字段', '链接内出现账号标识，但无法确认属于分享人还是内容作者。'];
  if (author.has(key)) return ['author', '内容作者字段', '这是链接声称的内容作者，不代表分享人。'];
  if (device.has(key)) return ['device', '设备 / 安装字段', '不作为账号解析；不能因为值的格式相似就当作用户 sec_uid。'];
  if (tracking.has(key)) return ['tracking', '分享线索', '保留原值供核对；本工具没有该字段到账号的可靠公开映射。'];
  return ['other', '其他参数', '仅展示原始参数，不推断身份。'];
}

export function profileFor(key, value) {
  if (['share_sec_uid', 'share_sec_user_id', 'sec_uid', 'sec_user_id', 'author_sec_uid', 'profile'].includes(key) && /^MS4wLjAB[A-Za-z0-9_-]{8,240}$/.test(value)) {
    return 'https://www.douyin.com/user/' + encodeURIComponent(value);
  }
  return null;
}

// Protocol reference: tu95/FindYou documents these activity_info field names.
// Independently implemented; no upstream source or dependencies are bundled.
export function parseShareActivity(raw) {
  let value = raw;
  for (let attempt = 0; attempt < 3 && typeof value === 'string'; attempt++) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      try { const next = decodeURIComponent(value); if (next === value) break; value = next; }
      catch { break; }
    }
  }
  return null;
}

export function numericUid(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
  if (!['string', 'number'].includes(typeof value)) return null;
  const uid = String(value);
  return /^[1-9]\d{4,24}$/.test(uid) ? uid : null;
}

function activityEvidence(raw, source) {
  const activity = parseShareActivity(raw);
  if (!activity) return [];
  const evidence = [];
  const add = (key, value, kind, label, note) => evidence.push({key: 'activity_info.' + key, value, kind, label, note, source, profile: null});
  const uid = numericUid(activity.social_share_user_id);
  if (uid) add('social_share_user_id', uid, 'sharer', '分享人 UID', '从分享活动字段直接读取的账号 UID；再次转发可能保留原分享人，不证明当前发送人的身份。');
  const authorId = numericUid(activity.social_author_id);
  if (authorId) add('social_author_id', authorId, 'author', '分享时引用的作者 UID', '作者字段独立展示，不用它代替分享人 UID。');
  if (typeof activity.social_share_time === 'string' && /^\d{9,13}$/.test(activity.social_share_time)) add('social_share_time', activity.social_share_time, 'tracking', '分享时间戳', '来自分享活动参数的原始时间戳，不用于判断账号。');
  return evidence;
}

export function analyzeShareUrls(values) {
  if (!Array.isArray(values) || !values.length || values.length > 8) throw new Error('跳转链格式不正确。');
  const urls = values.map(value => validateDouyinUrl(value).href);
  const fields = [];
  const videos = new Set();
  urls.forEach((value, index) => {
    const url = new URL(value);
    const video = url.pathname.match(/^\/(?:share\/)?(?:video|note)\/(\d+)\/?$/)?.[1] || url.searchParams.get('modal_id');
    if (/^\d{10,25}$/.test(video || '')) videos.add(video);
    const profile = url.pathname.match(/^\/(?:share\/)?user\/([^/]+)\/?$/)?.[1];
    if (profile) fields.push({key: 'profile', value: decodeSafe(profile), kind: 'profile', label: '主页所属账号', note: '这是被分享主页的账号，不能据此认定是分享人。', source: index + 1, profile: profileFor('profile', decodeSafe(profile))});
    for (const [key, val] of url.searchParams) {
      const [kind, label, note] = describe(key);
      fields.push({key, value: val, kind, label, note, source: index + 1, profile: profileFor(key, val)});
      if (key === 'activity_info') fields.push(...activityEvidence(val, index + 1));
    }
  });
  const candidates = fields.filter(field => field.kind === 'candidate' && /^(?:\d{5,25}|MS4wLjAB[A-Za-z0-9_-]{8,240})$/.test(field.value));
  const sharers = [...new Set(fields.filter(field => field.kind === 'sharer').map(field => field.value))];
  const clues = fields.filter(field => field.kind === 'tracking');
  const short = new URL(urls.at(-1)).hostname === 'v.douyin.com';
  const state = sharers.length > 1 ? 'conflict' : sharers.length ? 'identified' : candidates.length ? 'candidate' : clues.length ? 'clues' : short ? 'short' : 'unavailable';
  return {urls, fields, candidates, sharers, videos: [...videos], state, confirmed: false};
}

function decodeSafe(value) { try { return decodeURIComponent(value); } catch { return value; } }
