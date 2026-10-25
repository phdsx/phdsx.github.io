import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseBilibiliInput, validateMediaUrl } from '../scripts/bilibili-url.mjs';
import { signWbi, resolveBilibili, videoApiResponse, VIDEO_API_PREFIX } from '../../../worker/bilibili.mjs';

const bvid = 'BV1xx411c7mD';
const media = 'https://upos-sz-mirrorcos.bilivideo.com/upgcxcode/01/02/3/3-1-30080.m4s?deadline=9999999999';
const images = {img_url:'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',sub_url:'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'};
const view = {bvid,title:'<img src=x onerror=alert(1)>',owner:{name:'Uploader'},pages:[{page:1,cid:3,part:'第一集',duration:10},{page:2,cid:4,part:'第二集',duration:20}],rights:{}};
const play = {quality:80,accept_quality:[120,80,64],support_formats:[{quality:120,new_description:'4K'},{quality:80,new_description:'1080P'},{quality:64,new_description:'720P'}],dash:{video:[{id:80,codecid:7,codecs:'avc1.640028',baseUrl:media,bandwidth:2000000,width:1920,height:1080},{id:64,codecid:7,codecs:'avc1.64001f',base_url:media,bandwidth:1000000,width:1280,height:720}],audio:[{codecs:'mp4a.40.2',bandwidth:128000,baseUrl:media}]}};
function fixture({video=view,player=play,loggedIn=false,onFetch=()=>{}}={}) {
  return async (input,init) => {
    const url = new URL(input); onFetch(url,init);
    if (url.hostname === 'b23.tv') return new Response(null,{status:302,headers:{location:`https://www.bilibili.com/video/${bvid}/?p=2`}});
    if (url.pathname.endsWith('/view')) return Response.json({code:0,data:video});
    if (url.pathname.endsWith('/nav')) return Response.json({code:loggedIn ? 0 : -101,data:{wbi_img:images,isLogin:loggedIn}});
    if (url.pathname.endsWith('/playurl')) return Response.json({code:0,data:player});
    throw new Error('Unexpected fixture URL');
  };
}
test('BV, AV, share text, page parameters and short links',() => {
  assert.deepEqual(parseBilibiliInput(bvid),{id:bvid,page:1});
  assert.deepEqual(parseBilibiliInput('av2'),{id:'av2',page:1});
  assert.deepEqual(parseBilibiliInput(`分享【视频】 https://www.bilibili.com/video/${bvid}/?p=2&share_source=copy。`),{id:bvid,page:2});
  assert.deepEqual(parseBilibiliInput('https://b23.tv/abc123'),{shortUrl:'https://b23.tv/abc123'});
  for (const input of ['https://evil.test/video/'+bvid,'https://bilibili.com.evil.test/video/'+bvid,'https://evil.test/?url=https://bilibili.com/video/'+bvid,`https://www.bilibili.com/video/${bvid}/?p=0`,`https://www.bilibili.com/video/${bvid}/?p=2.3`,'https://www.bilibili.com/bangumi/play/ep1']) assert.throws(() => parseBilibiliInput(input));
});
test('WBI signature uses sorted sanitized query and expected mixin key',() => {
  const q = 'bar=514&foo=114&wts=1702204169&z=a';
  const key = 'ea1db124af3c7062474693fa704f4ff8';
  const expected = createHash('md5').update(q+key).digest('hex');
  assert.equal(signWbi({foo:114,bar:514,z:"a!'()*"},images,1702204169000),q+'&w_rid='+expected);
});
test('Only official standard HTTPS media paths may be proxied',() => {
  assert.equal(validateMediaUrl(media),media);
  for (const url of ['http://localhost/a.mp4','https://127.0.0.1/upgcxcode/a.mp4','https://bilivideo.com.evil.test/upgcxcode/a.mp4','https://a.bilivideo.com:8082/upgcxcode/a.mp4','https://a.bilivideo.com/admin','https://user:pass@a.bilivideo.com/upgcxcode/a.mp4','https://a.bilivideo.com/upgcxcode/%2f%2e%2e/a.mp4']) assert.throws(() => validateMediaUrl(url));
});
test('DASH returns real qualities, pairs audio, exposes missing qualities and resolves parts',async () => {
  const requests = [];
  const data = await resolveBilibili('https://b23.tv/abc123','',fixture({onFetch:(url)=>requests.push(url)}));
  assert.equal(data.page,2); assert.equal(data.duration,20); assert.equal(data.title,view.title);
  assert.deepEqual(data.formats.map(f=>f.quality),[80,64]);
  assert.ok(data.formats.every(f=>f.audio.codec==='mp4a.40.2'));
  assert.deepEqual(data.unavailable,['4K']);
  assert.equal(requests.at(-1).searchParams.get('cid'),'4');
});
test('P2P media addresses select valid official CDN backups',async () => {
  const player = structuredClone(play);
  player.dash.video[0].baseUrl = 'https://xy1x2x3x4xy.mcdn.bilivideo.cn:8082/v1/resource/upgcxcode/01/a.m4s';
  player.dash.video[0].backupUrl = [media];
  const data = await resolveBilibili(bvid,'',fixture({player}));
  assert.equal(data.formats[0].url,media);
});
test('Credentials are validated, forwarded only to API and never returned',async () => {
  const cookies = [];
  const data = await resolveBilibili(bvid,'test-session',fixture({loggedIn:true,onFetch:(url,init)=>cookies.push(init.headers.Cookie)}));
  assert.ok(cookies.every(c=>c==='SESSDATA=test-session'));
  assert.ok(!JSON.stringify(data).includes('test-session'));
  await assert.rejects(resolveBilibili(bvid,'test-session',fixture()),/登录状态/);
  await assert.rejects(resolveBilibili(bvid,'x;other=y',fixture()),/凭据格式/);
});
test('Reject missing parts, paid content, trials, unavailable streams and untrusted redirects',async () => {
  await assert.rejects(resolveBilibili(`https://www.bilibili.com/video/${bvid}/?p=99`,'',fixture()),/分 P 不存在/);
  await assert.rejects(resolveBilibili(bvid,'',fixture({video:{...view,rights:{pay:1}}})),/付费/);
  await assert.rejects(resolveBilibili(bvid,'',fixture({player:{...play,is_preview:1}})),/试看/);
  await assert.rejects(resolveBilibili(bvid,'',fixture({player:{}})),/没有可下载/);
  let calls=0;
  await assert.rejects(resolveBilibili('https://b23.tv/test','',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});}),/B 站/);
  assert.equal(calls,1);
});
const request = (path,init) => new Request('https://example.test'+VIDEO_API_PREFIX+path,init);
test('API body limits, origin checks, invalid JSON and method handling',async () => {
  assert.equal((await videoApiResponse(request('health'))).status,200);
  assert.equal((await videoApiResponse(request('resolve'))).status,405);
  assert.equal((await videoApiResponse(request('resolve',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'}))).status,415);
  assert.equal((await videoApiResponse(request('resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status,400);
  assert.equal((await videoApiResponse(request('resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:' '.repeat(8193)}))).status,413);
  assert.equal((await videoApiResponse(request('health',{headers:{origin:'https://evil.test'}}))).status,403);
  const response = await videoApiResponse(request('resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:bvid})}),fixture());
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Media proxy preserves byte ranges, streams content and blocks unsafe destinations',async () => {
  let forwarded;
  const response = await videoApiResponse(request('stream?url='+encodeURIComponent(media),{headers:{range:'bytes=0-3'}}),async(url,init)=>{forwarded={url,init};return new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/10','Content-Length':'4','Accept-Ranges':'bytes'}});});
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 0-3/10');assert.equal(forwarded.init.headers.Range,'bytes=0-3');assert.equal(forwarded.init.headers.Cookie,undefined);assert.equal(forwarded.init.redirect,'error');assert.equal((await response.arrayBuffer()).byteLength,4);
  assert.equal((await videoApiResponse(request('stream?url='+encodeURIComponent(media),{headers:{range:'bytes=0-1,4-5'}}))).status,400);
  assert.equal((await videoApiResponse(request('stream?url=https://localhost/private'))).status,422);
});
