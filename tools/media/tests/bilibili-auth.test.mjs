import test from 'node:test';
import assert from 'node:assert/strict';
import { videoApiResponse, VIDEO_API_PREFIX } from '../../../worker/bilibili.mjs';

const env = {BILIBILI_SESSION_SECRET:'test-secret-for-bilibili-login-at-least-32-characters'};
const key = 'a'.repeat(32);
const credential = 'private-session-value%2C123456';
const origin = 'https://tool.example';
function request(action,{cookie='',method=action==='status'?'GET':'POST',headers={},body}={}) {
  return new Request(origin+VIDEO_API_PREFIX+'auth/'+action,{method,headers:{...(method==='POST'?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(method==='POST'?{body:body??'{}'}:{})});
}
function jar(...responses) {
  const cookies = new Map();
  for (const response of responses) for (const header of response.headers.getSetCookie()) {
    const pair=header.split(';')[0];const at=pair.indexOf('=');
    if(header.includes('Max-Age=0'))cookies.delete(pair.slice(0,at));else cookies.set(pair.slice(0,at),pair.slice(at+1));
  }
  return [...cookies].map(([k,v])=>k+'='+v).join('; ');
}
function fixture({state=0,valid=true,callback=false,legacy=false,qrHost='account.bilibili.com',record=[]}={}) {
  return async (input,init) => {
    const url=new URL(input);record.push({url,init});
    if(url.pathname.endsWith('/generate'))return Response.json({code:0,data:{qrcode_key:key,url:legacy?`https://passport.bilibili.com/h5-app/passport/login/scan?auth_code=${key}`:`https://${qrHost}/h5/account-h5/auth/scan-web?qrcode_key=${key}`}});
    if(url.pathname.endsWith('/poll'))return Response.json({code:0,data:{code:state,url:`https://passport.biligame.com/crossDomain?SESSDATA=${encodeURIComponent(credential)}`,refresh_token:'must-not-leak'}},{headers:callback?{}:{'Set-Cookie':`SESSDATA=${credential}; Domain=.bilibili.com; Path=/; HttpOnly`}});
    if(url.pathname.endsWith('/nav'))return Response.json({code:valid?0:-101,data:valid?{isLogin:true,uname:'测试账号',mid:123,vipStatus:1}:{isLogin:false}});
    if(url.pathname.endsWith('/view'))return Response.json({code:0,data:{bvid:'BV1xx411c7mD',title:'Video',rights:{},pages:[{page:1,cid:1,part:'Part',duration:1}]}});
    if(url.pathname.endsWith('/playurl'))return Response.json({code:0,data:{dash:{video:[{id:80,codecid:7,codecs:'avc1.640028',baseUrl:'https://upos-sz-mirrorcos.bilivideo.com/upgcxcode/1/a.m4s'}],audio:[]}}});
    throw new Error('Unexpected fixture request');
  };
}
async function signIn(fetcher=fixture()) {
  const generated=await videoApiResponse(request('qrcode'),fetcher,env);
  assert.equal(generated.status,200);
  const loggedIn=await videoApiResponse(request('poll',{cookie:jar(generated)}),fetcher,env);
  return {generated,loggedIn,cookie:jar(generated,loggedIn)};
}
test('QR generation accepts current and legacy official QR URLs, with sealed browser-bound challenge',async()=>{
  for(const legacy of [false,true]) {
    const response=await videoApiResponse(request('qrcode'),fixture({legacy}),env);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.ok(data.expiresAt>Date.now());assert.ok(data.url.includes(key));assert.equal(data.qrcode_key,undefined);
    const cookie=response.headers.getSetCookie()[0];
    assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);
    assert.ok(!cookie.includes(key));assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await videoApiResponse(request('qrcode'),fixture({qrHost:'evil.example'}),env)).status,422);
});
test('Waiting, scanned and expired states never expose login credentials',async()=>{
  for(const [state,expected] of [[86101,'waiting'],[86090,'scanned'],[86038,'expired'],[86083,'expired']]) {
    const generated=await videoApiResponse(request('qrcode'),fixture(),env);
    const response=await videoApiResponse(request('poll',{cookie:jar(generated)}),fixture({state}),env);
    const data=await response.json();assert.equal(data.state,expected);assert.ok(!JSON.stringify(data).includes(credential));
  }
});
test('Confirmed login verifies account and stores only encrypted HttpOnly session',async()=>{
  const calls=[];const {generated,loggedIn,cookie}=await signIn(fixture({record:calls}));
  assert.equal(loggedIn.status,200);const data=await loggedIn.json();
  assert.deepEqual(data,{state:'logged_in',loggedIn:true,user:{name:'测试账号',vip:true}});
  assert.ok(!cookie.includes(credential));assert.ok(!cookie.includes('must-not-leak'));
  assert.equal(loggedIn.headers.getSetCookie().length,2);
  assert.match(loggedIn.headers.getSetCookie()[0],/phdsx_bili_session=/);
  assert.match(loggedIn.headers.getSetCookie()[1],/Max-Age=0/);
  const status=await videoApiResponse(request('status',{cookie}),fixture(),env);
  assert.equal((await status.json()).loggedIn,true);
  assert.equal(calls.at(-1).init.headers.Cookie,'SESSDATA='+credential);
  // QR challenge keys are sealed cookies, never accepted from browser request bodies.
  const noChallenge=await videoApiResponse(request('poll',{body:JSON.stringify({qrcode_key:key})}),fixture(),env);
  assert.equal((await noChallenge.json()).state,'expired');
});
test('Callback credentials are parsed locally and verified without fetching callback URL',async()=>{
  const calls=[];const {loggedIn}=await signIn(fixture({callback:true,record:calls}));
  assert.equal((await loggedIn.json()).state,'logged_in');
  assert.ok(calls.every(c=>['passport.bilibili.com','api.bilibili.com'].includes(c.url.hostname)));
});
test('Unconfirmed account is never reported as logged in',async()=>{
  const generated=await videoApiResponse(request('qrcode'),fixture(),env);
  const response=await videoApiResponse(request('poll',{cookie:jar(generated)}),fixture({valid:false}),env);
  assert.equal(response.status,422);assert.match((await response.json()).message,/未确认登录状态/);
  assert.equal(response.headers.getSetCookie().length,0);
});
test('Session cannot cross origins, be tampered with, or be decrypted with a different key',async()=>{
  const {cookie}=await signIn();
  const otherOrigin=new Request('https://other.example'+VIDEO_API_PREFIX+'auth/status',{headers:{Cookie:cookie}});
  assert.equal((await(await videoApiResponse(otherOrigin,fixture(),env)).json()).loggedIn,false);
  const tampered=cookie.replace('=','=X');
  assert.equal((await(await videoApiResponse(request('status',{cookie:tampered}),fixture(),env)).json()).loggedIn,false);
  assert.equal((await(await videoApiResponse(request('status',{cookie}),fixture(),{BILIBILI_SESSION_SECRET:'different-secret-longer-than-32-characters'})).json()).loggedIn,false);
});
test('Expired QR and session tokens are rejected before upstream calls',async()=>{
  const {generated,cookie}=await signIn();const now=Date.now;
  const fail=()=>{throw new Error('Must not call upstream for expired token');};
  try {
    const time=now();Date.now=()=>time+180001;
    assert.equal((await(await videoApiResponse(request('poll',{cookie:jar(generated)}),fail,env)).json()).state,'expired');
    Date.now=()=>time+8*3600000+1;
    assert.equal((await(await videoApiResponse(request('status',{cookie}),fail,env)).json()).loggedIn,false);
  } finally {Date.now=now;}
});
test('Page keepalive only renews an unexpired session after verifying the upstream account',async()=>{
  const {cookie}=await signIn();const original=Date.now,start=original();
  try{
    Date.now=()=>start+7*3600000;
    const response=await videoApiResponse(request('renew',{cookie}),fixture(),env);
    assert.equal(response.status,200);assert.equal((await response.json()).loggedIn,true);
    const renewed=jar(response);assert.ok(renewed);assert.ok(!renewed.includes(credential));
    Date.now=()=>start+9*3600000;
    assert.equal((await(await videoApiResponse(request('status',{cookie}),fixture(),env)).json()).loggedIn,false);
    assert.equal((await(await videoApiResponse(request('status',{cookie:renewed}),fixture(),env)).json()).loggedIn,true);
    const invalid=await videoApiResponse(request('renew',{cookie:renewed}),fixture({valid:false}),env);
    assert.equal((await invalid.json()).loggedIn,false);assert.match(invalid.headers.getSetCookie()[0],/Max-Age=0/);
  }finally{Date.now=original;}
});
test('Logout clears both session and challenge cookies, cancel clears challenge only',async()=>{
  const {cookie}=await signIn();
  const logout=await videoApiResponse(request('logout',{cookie}),fixture(),env);
  assert.equal((await logout.json()).loggedIn,false);
  assert.equal(logout.headers.getSetCookie().length,2);
  assert.ok(logout.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));
  const canceled=await videoApiResponse(request('cancel',{cookie}),fixture(),env);
  assert.equal(canceled.headers.getSetCookie().length,1);assert.match(canceled.headers.getSetCookie()[0],/phdsx_bili_qr=/);
});
test('Auth checks request methods, origin, JSON and deployment secret',async()=>{
  assert.equal((await videoApiResponse(request('qrcode',{method:'GET'}),fixture(),env)).status,405);
  assert.equal((await videoApiResponse(request('qrcode',{headers:{Origin:'https://evil.example'}}),fixture(),env)).status,403);
  assert.equal((await videoApiResponse(request('qrcode',{headers:{'Content-Type':'text/plain'}}),fixture(),env)).status,415);
  assert.equal((await videoApiResponse(request('qrcode'),fixture())).status,503);
  assert.equal((await(await videoApiResponse(request('status'),fixture())).json()).enabled,false);
});
test('Resolver automatically uses QR session without exposing credentials to client or CDN',async()=>{
  const {cookie}=await signIn();const calls=[];
  const fetcher=fixture({record:calls});
  // A valid WBI image pair is needed after the login check.
  const withWbi=async(url,init)=>{
    const response=await fetcher(url,init);
    if(new URL(url).pathname.endsWith('/nav')){const d=await response.json();d.data.wbi_img={img_url:'https://i0.hdslb.com/bfs/wbi/'+ 'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+ 'b'.repeat(32)+'.png'};return Response.json(d);}
    return response;
  };
  const response=await videoApiResponse(new Request(origin+VIDEO_API_PREFIX+'resolve',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({url:'BV1xx411c7mD'})}),withWbi,env);
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.loggedIn,true);assert.equal(data.formats[0].quality,80);
  assert.ok(calls.every(c=>c.init.headers.Cookie==='SESSDATA='+credential));
  assert.ok(!JSON.stringify(data).includes(credential));
});
