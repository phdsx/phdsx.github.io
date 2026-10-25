import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {setImmediate} from 'node:timers/promises';
import {createVideoService,normalizeVideo,cookiesToNetscape,MEDIA_API_PREFIX} from '../service/video-service.mjs';
const fixture={id:'jNQXAC9IVRw',title:'A video',duration:1,uploader:'Tester',formats:[{format_id:'v',url:'https://r1.googlevideo.com/videoplayback?test=1',height:1080,width:1920,vcodec:'avc1.640028',acodec:'none',tbr:2000,ext:'mp4'},{format_id:'a',url:'https://r1.googlevideo.com/videoplayback?audio=1',vcodec:'none',acodec:'mp4a.40.2',abr:128,ext:'m4a'},{format_id:'bad',url:'https://127.0.0.1/secret',height:2160,vcodec:'avc',acodec:'aac'}]};
function req(action,body,cookie='',headers={}){return new Request('https://tool.example'+MEDIA_API_PREFIX+action,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
function runner(config,onEvent){let canceled=false;const done=(async()=>{await setImmediate();if(config.mode==='inspect')onEvent({event:'info',info:structuredClone(fixture)});else{onEvent({event:'progress',downloaded:8,total:10});await writeFile(path.join(config.directory,'video.mp4'),new Uint8Array([1,2,3,4,5]));onEvent({event:'ready',file:'video.mp4'});}if(canceled)throw new Error('Canceled');})();return {done,cancel(){canceled=true;}};}
async function resolve(service){const r=await service(req('resolve',{url:'https://www.youtube.com/watch?v=jNQXAC9IVRw',cookie:'session=test'}));assert.equal(r.status,200);return {data:await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};}
test('Normalize real qualities and audio pairing, filter unsafe stream URLs, keep original MP4 without dimensions',()=>{
  const d=normalizeVideo(fixture,'youtube');assert.equal(d.formats.length,1);assert.equal(d.formats[0].selector,'v+a');assert.equal(d.formats[0].height,1080);
  const x=normalizeVideo({formats:[{format_id:'direct',url:'https://sns-video-bd.xhscdn.com/video.mp4',ext:'mp4'}]},'xiaohongshu');assert.equal(x.formats[0].label,'原始画质');
  assert.throws(()=>normalizeVideo({...fixture,is_live:true},'youtube'));assert.throws(()=>normalizeVideo({...fixture,has_drm:true},'youtube'));
});
test('Convert optional cookies only for selected platform and reject header injection',()=>{
  assert.match(cookiesToNetscape('session=abc; token=xyz','douyin'),/\.douyin.com\tTRUE/);
  assert.ok(!cookiesToNetscape('session=abc','xiaohongshu').includes('youtube.com'));
  assert.throws(()=>cookiesToNetscape('session=abc\r\nx=1','youtube'));assert.throws(()=>cookiesToNetscape('not-cookie','youtube'));
});
test('Resolve creates browser-bound session without exposing URLs or cookies',async()=>{
  const service=createVideoService({runner});const {data,cookie}=await resolve(service);
  assert.equal(data.platform,'youtube');assert.equal(data.formats[0].id,'v');
  assert.ok(!JSON.stringify(data).includes('googlevideo'));assert.ok(!JSON.stringify(data).includes('session=test'));
  const forbidden=await service(req('jobs',{sessionId:data.sessionId,formatId:'v'}));assert.equal(forbidden.status,404);
  const invalid=await service(req('jobs',{sessionId:data.sessionId,formatId:'invalid'},cookie));assert.equal(invalid.status,400);
});
test('Download lifecycle serves ready file and ranges; release removes it',async()=>{
  const service=createVideoService({runner});const {data,cookie}=await resolve(service);
  const created=await service(req('jobs',{sessionId:data.sessionId,formatId:'v'},cookie));const job=await created.json();
  let state;for(let i=0;i<30;i++){await setImmediate();state=await(await service(req('jobs/'+job.id,null,cookie))).json();if(state.state==='ready')break;}
  assert.equal(state.state,'ready');assert.equal(state.size,5);
  const file=await service(req('jobs/'+job.id+'/file',null,cookie,{Range:'bytes=1-3'}));assert.equal(file.status,206);assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[2,3,4]);
  assert.equal((await service(req('jobs/'+job.id+'/file'))).status,404);
  assert.equal((await service(req('jobs/'+job.id+'/file',null,cookie,{Range:'bytes=100-'}))).status,416);
  assert.equal((await service(req('jobs/'+job.id+'/release',{},cookie))).status,200);
  assert.equal((await service(req('jobs/'+job.id,null,cookie))).status,404);
});
test('Cancel terminates only the owned task and rejects later access',async()=>{
  let stop,output;const custom=(config,onEvent)=>{if(config.mode==='inspect')return runner(config,onEvent);output=config.directory;let reject;const done=new Promise((resolve,rej)=>{reject=rej;});return {done,cancel(){stop=true;reject(new Error('Canceled'));}};};
  const service=createVideoService({runner:custom});const {data,cookie}=await resolve(service);const job=await(await service(req('jobs',{sessionId:data.sessionId,formatId:'v'},cookie))).json();
  assert.equal((await service(req('jobs/'+job.id+'/cancel',{},cookie))).status,200);assert.equal(stop,true);
  assert.equal((await service(req('jobs/'+job.id,null,cookie))).status,404);
});
test('Short-link redirects cannot escape platform, request origin is enforced and sessions expire',async()=>{
  let upstreamCalls=0;const service=createVideoService({runner,fetcher:async()=>{upstreamCalls++;return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}});}});
  assert.equal((await service(req('resolve',{url:'https://v.douyin.com/abc123/'}))).status,502);assert.equal(upstreamCalls,1);
  assert.equal((await service(req('resolve',{url:'https://youtu.be/jNQXAC9IVRw'},'',{Origin:'https://evil.example'}))).status,403);
  let clock=Date.now();const expiring=createVideoService({runner,now:()=>clock});const {data,cookie}=await resolve(expiring);clock+=31*60000;
  assert.equal((await expiring(req('jobs',{sessionId:data.sessionId,formatId:'v'},cookie))).status,404);
});
