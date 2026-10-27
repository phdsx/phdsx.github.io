import { extractShareUrl, validateDouyinUrl, numericUid } from '../tools/media/scripts/share-account-core.mjs';
import { resolvePublicShareProfile } from './douyin-share-profile.mjs';

export const SHARE_API_PATH = '/tools/media/share-account/api/resolve';
const redirects = new Set([301, 302, 303, 307, 308]);
const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};

export async function resolveShareChain(input, fetcher = fetch) {
  const initial = extractShareUrl(input);
  const chain = [];
  const visited = new Set();
  let current = initial;
  const signal = AbortSignal.timeout(15000);
  for (let hop = 0; hop < 6; hop++) {
    validateDouyinUrl(current); // Check every hop before issuing a request.
    if (visited.has(current)) return {chain, complete: false, message: '平台跳转形成循环，已保留已取得的链接。'};
    visited.add(current);
    let response;
    try {
      response = await fetcher(current, {redirect: 'manual', credentials: 'omit', signal, headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}});
    } catch {
      chain.push({url: current, status: null});
      return {chain, complete: false, message: '平台请求失败或超时，已保留已取得的链接。'};
    }
    chain.push({url: current, status: response.status});
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!redirects.has(response.status)) return {chain, complete: response.ok, message: response.ok ? '跳转链已展开；未读取页面账号或登录数据。' : `平台返回 HTTP ${response.status}，无法继续展开。`};
    if (!location) return {chain, complete: false, message: '平台未提供跳转地址。'};
    try {
      current = validateDouyinUrl(new URL(location, current).href).href;
    } catch {
      return {chain, complete: false, message: '平台跳转到非支持地址，已停止请求。'};
    }
  }
  // Preserve the last Location, even when the request budget is exhausted.
  if (!visited.has(current)) chain.push({url: current, status: null});
  return {chain, complete: false, message: '已达到 6 次请求上限，已保留最后的跳转地址。'};
}

export async function shareAccountResponse(request, fetcher = fetch) {
  const json = (body, status = 200) => Response.json(body, {status, headers});
  if (new URL(request.url).pathname !== SHARE_API_PATH) return json({message: '接口不存在。'}, 404);
  if (request.method !== 'POST') return new Response('Method not allowed', {status: 405, headers: {...headers, Allow: 'POST'}});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({message: '不允许跨站调用。'}, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({message: '请发送 JSON 格式。'}, 415);
  try {
    // Bound streamed bodies too, not just the caller-controlled Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({message: '请输入分享链接。'}, 400);
    const chunks = []; let size = 0;
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32768) { await reader.cancel(); return json({message: '输入过长。'}, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (body?.operation === 'profile') {
      if (!numericUid(body.uid)) return json({message: '分享人 UID 格式不正确。'}, 400);
      try {
        return json({profile: await resolvePublicShareProfile(body.uid, fetcher), message: '公开主页已按分享人 UID 匹配。'});
      } catch {
        return json({profile: null, message: '暂时无法查询公开主页，可稍后重试。'}, 502);
      }
    }
    if (body?.operation && body.operation !== 'resolve') return json({message: '不支持的操作。'}, 400);
    return json(await resolveShareChain(body?.input, fetcher));
  } catch (error) {
    return json({message: error instanceof SyntaxError ? 'JSON 格式不正确。' : error.message || '链接解析失败。'}, 400);
  }
}
