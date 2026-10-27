import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';

test('Real tool UI restores per-platform credentials, never sends another provider credential, and retains failed sessions',async t=>{
  const original={window:globalThis.window,document:globalThis.document,location:globalThis.location,Option:globalThis.Option,fetch:globalThis.fetch};
  t.after(()=>Object.assign(globalThis,original));
  const nodes=new Map(),windowEvents=new Map(),requests=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{id,value:id==='auth-platform'?'bilibili':'',textContent:'',hidden:true,disabled:false,dataset:{},events:{},addEventListener(name,callback){this.events[name]=callback;},replaceChildren(...values){this.options=values;this.value=values[0]?.value||'';},focus(){},removeAttribute(){}});return nodes.get(id);}
  globalThis.document={hidden:false,getElementById:node,addEventListener(){}};
  globalThis.window={addEventListener(name,callback){if(!windowEvents.has(name))windowEvents.set(name,[]);windowEvents.get(name).push(callback);}};
  globalThis.location=new URL('http://127.0.0.1:8194/tools/media/bilibili-downloader.html');
  globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).pathname.endsWith('/status'))return Response.json({loggedIn:false});
    requests.push(JSON.parse(options.body));
    return Response.json({message:'平台要求新的有效 Cookie'},{status:422});
  };
  await import('../scripts/bilibili-downloader.mjs?session-ui-test');await setImmediate();
  const select=platform=>{node('auth-platform').value=platform;node('auth-platform').events.change();};
  const fill=(id,value)=>{node(id).value=value;node(id).events.input();};
  for(const [platform,credential] of [['douyin','douyin-test-cookie'],['youtube','youtube-test-cookie'],['xiaohongshu','xhs-test-cookie']]){select(platform);fill('platform-cookie',credential);}
  select('bilibili');fill('sessdata','bilibili-test-session');
  select('douyin');assert.equal(node('platform-cookie').value,'douyin-test-cookie');assert.equal(node('bilibili-login-controls').hidden,true);assert.equal(node('douyin-login-controls').hidden,false);assert.equal(node('xiaohongshu-login-controls').hidden,true);assert.match(node('platform-qr-support').textContent,/抖音可使用扫码/);
  select('youtube');assert.equal(node('platform-cookie').value,'youtube-test-cookie');
  // Link detection selects Douyin's retained credential even when YouTube was
  // the last account panel the user visited.
  fill('video-url','https://www.douyin.com/video/7699779226500753338');
  node('parse-form').events.submit({preventDefault(){}});await setImmediate();await setImmediate();
  assert.equal(requests.at(-1).cookie,'douyin-test-cookie');assert.equal(requests.at(-1).sessdata,undefined);
  assert.equal(node('platform-cookie').value,'douyin-test-cookie');
  select('youtube');select('douyin');assert.equal(node('platform-cookie').value,'douyin-test-cookie');
  node('clear-platform-session').events.click();assert.equal(node('platform-cookie').value,'');select('youtube');assert.equal(node('platform-cookie').value,'youtube-test-cookie');
  for(const callback of windowEvents.get('pagehide'))callback({persisted:true});select('xiaohongshu');assert.equal(node('platform-cookie').value,'xhs-test-cookie');
  for(const callback of windowEvents.get('pagehide'))callback({persisted:false});select('youtube');assert.equal(node('platform-cookie').value,'');select('bilibili');assert.equal(node('sessdata').value,'');
});
