import md5 from '../assets/vendor/js-md5-0.8.3/md5.mjs';
import { parseBilibiliInput, validateMediaUrl } from '../tools/media/scripts/bilibili-url.mjs';
import { authResponse, sessionFromRequest } from './bilibili-auth.mjs';

export const VIDEO_API_PREFIX = '/tools/media/bilibili/api/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36', Referer: 'https://www.bilibili.com/' };
const MIXIN = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
const LABELS = { 6:'240P 极速', 16:'360P 流畅', 32:'480P 清晰', 64:'720P 高清', 74:'720P 60帧', 80:'1080P 高清', 112:'1080P 高码率', 116:'1080P 60帧', 120:'4K 超清', 125:'HDR', 126:'杜比视界', 127:'8K 超高清' };
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' } });

export function signWbi(params, images, now = Date.now()) {
  const raw = [images.img_url, images.sub_url].map(x => new URL(x).pathname.split('/').at(-1).split('.')[0]).join('');
  if (raw.length !== 64) throw new Error('B 站签名信息暂不可用，请稍后重试。');
  const key = MIXIN.map(i => raw[i]).join('').slice(0, 32);
  const query = Object.entries({ ...params, wts:Math.floor(now / 1000) }).sort(([a],[b]) => a.localeCompare(b, 'en')).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v).replace(/[!'()*]/g,''))}`).join('&');
  return `${query}&w_rid=${md5(query + key)}`;
}

function apiError(code, message) {
  const hints = { '-101':'登录状态无效或已过期，请更新登录凭据后重新解析。', '-10403':'该视频需要对应的登录或会员权限。', '-404':'视频不存在或已被删除。', '62002':'视频不可用或已被删除。', '-403':'该视频暂不可访问。', '-352':'B 站触发访问验证，请稍后重试。', '-412':'B 站暂时限制了请求，请稍后重试。' };
  return new Error(hints[String(code)] || `B 站接口返回 ${code}：${String(message || '解析失败').slice(0,160)}`);
}

async function biliApi(path, cookie, fetcher, allowUnsignedNav = false) {
  const response = await fetcher('https://api.bilibili.com' + path, { headers:{ ...HEADERS, ...(cookie ? {Cookie:cookie} : {}) }, redirect:'error', signal:AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`B 站接口暂不可用（HTTP ${response.status}），请稍后重试。`);
  const result = await response.json();
  if (result.code !== 0 && !(allowUnsignedNav && result.data?.wbi_img)) throw apiError(result.code, result.message);
  return result.data;
}

export async function resolveBilibili(input, sessdata = '', fetcher = fetch) {
  let parsed = parseBilibiliInput(input);
  if (parsed.shortUrl) {
    // Follow only known short-link hosts; inspect every redirect before fetching it.
    for (let hop = 0; hop < 4 && parsed.shortUrl; hop++) {
      const response = await fetcher(parsed.shortUrl, { headers:HEADERS, redirect:'manual', signal:AbortSignal.timeout(12000) });
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (![301,302,303,307,308].includes(response.status) || !location) throw new Error('短链接未能跳转，请从 B 站复制完整视频地址。');
      const target = new URL(location, parsed.shortUrl).href;
      parsed = parseBilibiliInput(target);
    }
    if (parsed.shortUrl) throw new Error('短链接跳转次数过多，请使用完整视频地址。');
  }
  if (typeof sessdata !== 'string' || sessdata.length > 2048 || /[\s;\r\n]/.test(sessdata)) throw new Error('登录凭据格式不正确，请仅填写 SESSDATA 的值。');
  const cookie = sessdata ? `SESSDATA=${sessdata}` : '';
  const video = await biliApi('/x/web-interface/view?' + new URLSearchParams(/^BV/.test(parsed.id) ? {bvid:parsed.id} : {aid:parsed.id.slice(2)}), cookie, fetcher);
  if (video.rights?.pay || video.is_upower_exclusive || video.is_upower_preview || video.is_upower_play) throw new Error('暂不支持付费、充电专属或试看视频。');
  const page = video.pages?.find(p => p.page === parsed.page);
  if (!page) throw new Error('该分 P 不存在，请检查链接中的 p 参数。');
  const nav = await biliApi('/x/web-interface/nav', cookie, fetcher, true);
  if (sessdata && !nav.isLogin) throw apiError(-101);
  const query = signWbi({ bvid:video.bvid, cid:page.cid, qn:127, fnval:4048, fnver:0, fourk:1 }, nav.wbi_img);
  const play = await biliApi('/x/player/wbi/playurl?' + query, cookie, fetcher);
  if (play.is_preview || play.isPreview || play.has_paid === false || (play.free_trial_info && Object.keys(play.free_trial_info).length)) throw new Error('接口返回的是试看内容，无法下载完整视频。');
  const descriptions = new Map((play.support_formats || []).map(f => [f.quality, f.new_description || f.display_desc || LABELS[f.quality]]));
  const stream = (s) => {
    // Prefer the standard HTTPS CDN; Bilibili also returns P2P :8082 URLs,
    // which cannot be fetched by Workers. Keep validated CDN backups.
    const urls = [s.baseUrl || s.base_url || s.url, ...(s.backupUrl || s.backup_url || [])].flatMap(value => {try {return [validateMediaUrl(value)];} catch {return [];} });
    if (!urls.length) throw new Error('B 站未返回可用的 HTTPS 视频流，请稍后重试。');
    return {url:urls[0],backups:[...new Set(urls.slice(1))],codec:s.codecs || '',bandwidth:Number(s.bandwidth) || 0};
  };
  const audio = (play.dash?.audio || []).filter(a => /^mp4a/.test(a.codecs)).sort((a,b) => b.bandwidth-a.bandwidth)[0];
  const formats = (play.dash?.video || []).filter(v => /^(avc|hev|hvc|av01)/.test(v.codecs)).map(v => ({ ...stream(v), id:`${v.id}-${v.codecid || v.codecs}`, quality:v.id, label:descriptions.get(v.id) || LABELS[v.id] || `${v.height}P`, width:v.width, height:v.height, frameRate:v.frameRate || v.frame_rate || '', type:'dash', audio:audio ? stream(audio) : null }));
  if (!formats.length && play.durl?.length === 1) {
    const d = play.durl[0];
    if (/\.mp4(?:\?|$)/.test(d.url)) formats.push({ ...stream(d), id:`${play.quality}-mp4`, quality:play.quality, label:descriptions.get(play.quality) || LABELS[play.quality] || '原始 MP4', type:'mp4', size:d.size || 0 });
  }
  const codecRank = codec => codec.startsWith('avc') ? 0 : /^(hev|hvc)/.test(codec) ? 1 : 2;
  formats.sort((a,b) => b.quality-a.quality || codecRank(a.codec)-codecRank(b.codec));
  if (!formats.length) throw new Error('没有可下载的 MP4 / DASH 视频流；该视频可能受限或使用旧版分段格式。');
  const available = new Set(formats.map(f => f.quality));
  const cover = String(video.pic || '').replace(/^http:/,'https:');
  return { bvid:video.bvid, title:video.title, owner:video.owner?.name || '', cover:/^https:\/\/i\d\.hdslb\.com\//.test(cover) ? cover : '', page:page.page, part:page.part, duration:page.duration || (play.timelength / 1000), pages:video.pages.map(p => ({page:p.page, part:p.part, duration:p.duration})), url:`https://www.bilibili.com/video/${video.bvid}/?p=${page.page}`, loggedIn:Boolean(nav.isLogin), formats, unavailable:(play.accept_quality || []).filter(q => !available.has(q)).map(q => descriptions.get(q) || LABELS[q] || String(q)), expiresAt:Date.now() + 30*60*1000 };
}

export async function videoApiResponse(request, fetcher = fetch, env = {}) {
  const url = new URL(request.url);
  try {
    const origin = request.headers.get('origin');
    if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return json({message:'请从本站工具页面发起请求。'},403);
    if (url.pathname.startsWith(VIDEO_API_PREFIX+'auth/')) return await authResponse(request,fetcher,env);
    if (url.pathname === VIDEO_API_PREFIX + 'health' && request.method === 'GET') return json({service:'bilibili',version:1});
    if (url.pathname === VIDEO_API_PREFIX + 'resolve') {
      if (request.method !== 'POST') return json({message:'请使用 POST 请求。'},405);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({message:'请求格式应为 JSON。'},415);
      if (Number(request.headers.get('content-length') || 0) > 8192) return json({message:'请求内容过长。'},413);
      const reader = request.body?.getReader();
      let size = 0; const chunks = [];
      if (reader) for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); return json({message:'请求内容过长。'},413); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
      let body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({message:'请求内容无效。'},400); }
      if (!body || typeof body !== 'object') return json({message:'请求内容无效。'},400);
      return json(await resolveBilibili(body.url, body.sessdata || await sessionFromRequest(request,env), fetcher));
    }
    if (url.pathname === VIDEO_API_PREFIX + 'stream') {
      if (!['GET','HEAD'].includes(request.method)) return json({message:'不支持的请求方法。'},405);
      const media = validateMediaUrl(url.searchParams.get('url'));
      const range = request.headers.get('range');
      if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return json({message:'Range 格式无效。'},400);
      const upstream = await fetcher(media, { method:request.method, headers:{...HEADERS, ...(range ? {Range:range} : {})}, redirect:'error', signal:AbortSignal.timeout(120000) });
      if (![200,206,416].includes(upstream.status)) { await upstream.body?.cancel(); return json({message:`视频流暂不可用（HTTP ${upstream.status}），请重新解析后下载。`},502); }
      const headers = new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
      for (const key of ['content-type','content-length','content-range','accept-ranges']) if (upstream.headers.has(key)) headers.set(key,upstream.headers.get(key));
      return new Response(upstream.body,{status:upstream.status,headers});
    }
    return json({message:'接口不存在。'},404);
  } catch (error) {
    // Never echo request bodies, credentials or signed media URLs into errors/logs.
    const message = error.name === 'TimeoutError' ? 'B 站连接超时，请稍后重试。' : error instanceof SyntaxError ? '接口返回格式异常，请稍后重试。' : /^fetch failed|network|redirect/i.test(error.message) ? '连接 B 站失败，请检查服务端网络后重试。' : error.message;
    return json({message},422);
  }
}
