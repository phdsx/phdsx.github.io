import { numericUid } from '../tools/media/scripts/share-account-core.mjs';

const site = 'https://www.douyin.com';
const registration = 'https://ttwid.bytedance.com/ttwid/union/register/';
const callbackPath = '/ttwid/union/register/callback/';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
const requestHeaders = {'User-Agent': userAgent, Referer: site + '/', Origin: site, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'zh-CN,zh;q=0.9'};

// Read bounded JSON only. No remote scripts, HTML execution or persistent cookies.
async function jsonBody(response) {
  if (!response.ok) { await response.body?.cancel(); throw new Error('公开主页接口暂时不可用。'); }
  if (!response.body) throw new Error('公开主页接口返回空数据。');
  const reader = response.body.getReader();
  const parts = []; let size = 0;
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 262144) { await reader.cancel(); throw new Error('公开主页接口返回数据过大。'); }
    parts.push(value);
  }
  const data = new Uint8Array(size); let offset = 0;
  for (const part of parts) { data.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(data)); }
  catch { throw new Error('平台未返回有效的公开主页数据，可能需要稍后重试。'); }
}

function profileRequestUrl(uid) {
  const url = new URL('/aweme/v1/web/user/profile/other/', site);
  // Public web endpoint protocol parameters, verified against the live service.
  const environment = {
    aid: '6383', device_platform: 'webapp', channel: 'channel_pc_web', platform: 'PC',
    pc_client_type: '1', pc_libra_divert: 'Windows', update_version_code: '170400',
    version_code: '290100', version_name: '29.1.0', support_h265: '1', support_dash: '0',
    browser_name: 'Edge', browser_version: '131.0.0.0', browser_language: 'zh-CN',
    browser_platform: 'Win32', browser_online: 'true', cookie_enabled: 'true',
    engine_name: 'Blink', engine_version: '131.0.0.0', os_name: 'Windows', os_version: '10',
    screen_width: '1920', screen_height: '1080', cpu_core_num: '12', device_memory: '8',
    downlink: '10', effective_type: '4g', round_trip_time: '50',
    max_cursor: '0', locate_query: 'false', show_live_replay_strategy: '1',
    need_time_list: '1', time_list_query: '0', whale_cut_token: '', cut_version: '1',
    count: '18', publish_video_strategy_type: '2', from_user_page: '1', user_id: uid
  };
  for (const [key, value] of Object.entries(environment)) url.searchParams.set(key, value);
  return url.href;
}

export async function resolvePublicShareProfile(value, fetcher = fetch) {
  const uid = numericUid(value);
  if (!uid) throw new Error('分享人 UID 格式不正确。');
  const signal = AbortSignal.timeout(12000);
  const options = {redirect: 'manual', credentials: 'omit', signal};
  const registrationResponse = await fetcher(registration, {
    ...options, method: 'POST', headers: {...requestHeaders, 'Content-Type': 'application/json'},
    body: JSON.stringify({aid: 1768, service: 'www.douyin.com', region: 'cn', union: true, needFid: false, cbUrlProtocol: 'https', migrate_info: {source: 'node', ticket: ''}})
  });
  const registrationData = await jsonBody(registrationResponse);
  let callback;
  try { callback = new URL(registrationData?.redirect_url); }
  catch { throw new Error('平台未提供匿名会话回调。'); }
  // The callback is remote input: require this single fixed official endpoint.
  if (callback.origin !== site || callback.pathname !== callbackPath || callback.username || callback.password || callback.port) throw new Error('平台返回了不支持的回调地址。');
  const callbackResponse = await fetcher(callback.href, {...options, headers: requestHeaders});
  const cookieHeaders = callbackResponse.headers.getSetCookie?.() ?? [callbackResponse.headers.get('set-cookie') || ''];
  const token = cookieHeaders.map(line => /(?:^|,\s*)ttwid=([^;,\s]+)/.exec(line)?.[1]).find(Boolean);
  await callbackResponse.body?.cancel();
  if (!callbackResponse.ok || !token || token.length > 4096 || /[\r\n]/.test(token)) throw new Error('平台未提供可用的匿名会话。');
  const response = await fetcher(profileRequestUrl(uid), {...options, headers: {...requestHeaders, Cookie: 'ttwid=' + token}});
  const data = await jsonBody(response);
  const user = data?.user;
  // Reject a response for any other account; never fall back to video authors.
  if (data?.status_code !== 0 || !user || numericUid(user.uid) !== uid) throw new Error('公开接口未返回与分享人 UID 一致的账号。');
  const secUid = user.sec_uid;
  if (typeof secUid !== 'string' || !/^MS4wLjAB[A-Za-z0-9_-]{8,240}$/.test(secUid)) throw new Error('已解析 UID，平台暂未返回可打开的主页标识。');
  return {
    uid, secUid, url: site + '/user/' + encodeURIComponent(secUid),
    nickname: typeof user.nickname === 'string' ? user.nickname.slice(0, 200) : '',
    handle: typeof user.unique_id === 'string' ? user.unique_id.slice(0, 200) : '',
    source: 'douyin-public-profile'
  };
}
