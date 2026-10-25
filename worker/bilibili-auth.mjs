const PREFIX = '/tools/media/bilibili/api/';
const SESSION = 'phdsx_bili_session';
const CHALLENGE = 'phdsx_bili_qr';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const QR_TTL = 180000;
const HEADERS = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',Referer:'https://www.bilibili.com/'};
const encoder = new TextEncoder();
const secretFor = env => typeof env.BILIBILI_SESSION_SECRET === 'string' && env.BILIBILI_SESSION_SECRET.length >= 32 ? env.BILIBILI_SESSION_SECRET : null;
const validSession = value => typeof value === 'string' && value.length > 0 && value.length <= 2048 && !/[\s;\r\n]/.test(value);
const base64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unbase64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c => c.charCodeAt(0));
const json = (data,status=200,cookies=[]) => {
  const headers = new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  for (const value of cookies) headers.append('Set-Cookie',value);
  return Response.json(data,{status,headers});
};
function cookie(request,name,value,clear=false) {
  return `${name}=${value}; Path=${PREFIX}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}${clear ? '; Max-Age=0' : ''}`;
}
function readCookie(request,name) {
  return (request.headers.get('cookie') || '').split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1) || '';
}
async function keyFor(secret) {
  const digest = await crypto.subtle.digest('SHA-256',encoder.encode(secret));
  return crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']);
}
async function seal(request,env,purpose,data,expiresAt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`${new URL(request.url).origin}|${purpose}|v1`)},await keyFor(secretFor(env)),encoder.encode(JSON.stringify({data,expiresAt})));
  return base64(iv)+'.'+base64(new Uint8Array(cipher));
}
async function open(request,env,purpose,value) {
  if (!secretFor(env) || !value || value.length > 4096) return null;
  try {
    const parts = value.split('.');
    if (parts.length !== 2 || !parts.every(x=>/^[A-Za-z0-9_-]+$/.test(x))) return null;
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(parts[0]),additionalData:encoder.encode(`${new URL(request.url).origin}|${purpose}|v1`)},await keyFor(secretFor(env)),unbase64(parts[1]));
    const payload = JSON.parse(new TextDecoder().decode(plain));
    return Number.isFinite(payload.expiresAt) && payload.expiresAt > Date.now() ? payload : null;
  } catch { return null; }
}
export async function sessionFromRequest(request,env={}) {
  const payload = await open(request,env,'session',readCookie(request,SESSION));
  return validSession(payload?.data?.sessdata) ? payload.data.sessdata : '';
}
async function passport(path,fetcher) {
  const response = await fetcher('https://passport.bilibili.com/x/passport-login/web/qrcode/'+path,{headers:HEADERS,redirect:'error',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`B 站登录服务暂不可用（HTTP ${response.status}）。`);
  const result = await response.json();
  if (result.code !== 0 || !result.data) throw new Error('B 站未能处理扫码登录请求，请稍后重试。');
  return {data:result.data,headers:response.headers};
}
async function account(sessdata,fetcher) {
  const response = await fetcher('https://api.bilibili.com/x/web-interface/nav',{headers:{...HEADERS,Cookie:'SESSDATA='+sessdata},redirect:'error',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('暂时无法验证 B 站登录状态，请稍后重试。');
  const result = await response.json();
  if (result.code === -101 || (result.code === 0 && !result.data?.isLogin)) return null;
  if (result.code !== 0 || !result.data?.isLogin) throw new Error('暂时无法验证 B 站登录状态，请稍后重试。');
  return {name:String(result.data.uname || 'B站用户').slice(0,100),vip:Boolean(result.data.vipStatus || result.data.vip?.status)};
}
function sessdataFromLogin(data,headers) {
  const values = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') || ''];
  for (const value of values) {
    const match = value.match(/(?:^|,\s*)SESSDATA=([^;,\s]+)/i);
    if (match && validSession(match[1])) return match[1];
  }
  // Some Bilibili responses put credentials in the cross-domain callback URL.
  // Parse that URL locally; never request it or return it to the browser.
  try {
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || !['passport.bilibili.com','passport.biligame.com','account.bilibili.com'].includes(url.hostname) || url.username || url.password || url.port) return '';
    const value = url.searchParams.get('SESSDATA');
    return validSession(value) ? value : '';
  } catch { return ''; }
}
export async function authResponse(request,fetcher=fetch,env={}) {
  const action = new URL(request.url).pathname.slice((PREFIX+'auth/').length);
  if (!['status','renew','qrcode','poll','logout','cancel'].includes(action)) return json({message:'登录接口不存在。'},404);
  if (request.method !== (action === 'status' ? 'GET' : 'POST')) return json({message:'不支持的请求方法。'},405);
  if (action !== 'status' && !request.headers.get('content-type')?.startsWith('application/json')) return json({message:'请求格式应为 JSON。'},415);
  if (Number(request.headers.get('content-length') || 0) > 1024) return json({message:'请求内容过长。'},413);
  const clearQr = cookie(request,CHALLENGE,'',true);
  const clearSession = cookie(request,SESSION,'',true);
  if (action === 'logout') return json({loggedIn:false},200,[clearSession,clearQr]);
  if (action === 'cancel') return json({state:'canceled'},200,[clearQr]);
  if (!secretFor(env)) return action === 'status' ? json({loggedIn:false,enabled:false}) : json({message:'扫码登录服务尚未配置，请联系站点维护者。'},503);
  if (action === 'status' || action === 'renew') {
    const sessdata = await sessionFromRequest(request,env);
    if (!sessdata) return json({loggedIn:false,enabled:true},200,[clearSession]);
    const user = await account(sessdata,fetcher);
    const cookies = !user ? [clearSession] : action === 'renew' ? [cookie(request,SESSION,await seal(request,env,'session',{sessdata},Date.now()+SESSION_TTL))] : [];
    return json({loggedIn:Boolean(user),enabled:true,...(user ? {user} : {})},200,cookies);
  }
  if (action === 'qrcode') {
    const {data} = await passport('generate',fetcher);
    let url;
    try { url = new URL(data.url); } catch { throw new Error('B 站返回的登录二维码无效。'); }
    const knownPage = (url.hostname === 'passport.bilibili.com' && url.pathname === '/h5-app/passport/login/scan' && url.searchParams.get('auth_code') === data.qrcode_key) || (url.hostname === 'account.bilibili.com' && url.pathname === '/h5/account-h5/auth/scan-web' && url.searchParams.get('qrcode_key') === data.qrcode_key);
    if (url.protocol !== 'https:' || !knownPage || url.port || url.username || url.password || !/^[a-f0-9]{32}$/i.test(data.qrcode_key)) throw new Error('B 站返回的登录二维码无效。');
    const expiresAt = Date.now()+QR_TTL;
    const token = await seal(request,env,'qr',{key:data.qrcode_key},expiresAt);
    return json({url:url.href,expiresAt},200,[cookie(request,CHALLENGE,token)]);
  }
  const challenge = await open(request,env,'qr',readCookie(request,CHALLENGE));
  if (!challenge || !/^[a-f0-9]{32}$/i.test(challenge.data?.key)) return json({state:'expired'},200,[clearQr]);
  const {data,headers} = await passport('poll?qrcode_key='+encodeURIComponent(challenge.data.key)+'&source=main-fe-header',fetcher);
  if (data.code === 86101 || data.code === 86090) return json({state:data.code === 86101 ? 'waiting' : 'scanned',expiresAt:challenge.expiresAt});
  if (data.code === 86038 || data.code === 86083) return json({state:'expired'},200,[clearQr]);
  if (data.code !== 0) return json({state:'error',message:'扫码登录未完成，请刷新二维码重试。'},422,[clearQr]);
  const sessdata = sessdataFromLogin(data,headers);
  if (!sessdata) throw new Error('B 站未返回完整登录凭据，请重新扫码。');
  const user = await account(sessdata,fetcher);
  if (!user) throw new Error('B 站未确认登录状态，请重新扫码。');
  const token = await seal(request,env,'session',{sessdata},Date.now()+SESSION_TTL);
  return json({state:'logged_in',loggedIn:true,user},200,[cookie(request,SESSION,token),clearQr]);
}
