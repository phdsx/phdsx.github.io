import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { initBilibiliLogin } from '../scripts/bilibili-login.mjs';

function harness(t,{states=['waiting','scanned','logged_in'],expired=false,failPoll=false,failRenew=false}={}) {
  const previous={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
  t.after(()=>Object.assign(globalThis,previous));
  const elements=new Map(),tasks=new Map(),calls=[],changes=[],qrs=[];let id=0;
  function element(name) {
    if(!elements.has(name))elements.set(name,{hidden:name==='qr-login-panel'||name==='logout-button',disabled:false,dataset:{},value:'manual-session',textContent:'',events:{},addEventListener(n,f){this.events[n]=f;},replaceChildren(){this.empty=true;},removeAttribute(){}});
    return elements.get(name);
  }
  const events={};
  globalThis.document={hidden:false,getElementById:element,addEventListener(n,f){events[n]=f;}};
  class QRCode {static CorrectLevel={M:0};constructor(node,options){qrs.push(options.text);}}
  globalThis.window={QRCode,addEventListener(n,f){events[n]=f;}};
  globalThis.setTimeout=(callback,delay)=>{const key=++id;tasks.set(key,{callback,delay});return key;};
  globalThis.clearTimeout=key=>tasks.delete(key);
  globalThis.fetch=async (input,options)=>{
    const action=new URL(input).pathname.split('/').at(-1);calls.push({action,options});
    if(action==='status')return Response.json({loggedIn:false});
    if(action==='renew'){if(failRenew)throw new TypeError('Failed to fetch');return Response.json({loggedIn:true,user:{name:'Tester',vip:true}});}
    if(action==='qrcode')return Response.json({url:'https://account.bilibili.com/h5/account-h5/auth/scan-web?qrcode_key='+ 'a'.repeat(32),expiresAt:Date.now()+(expired?-1:180000)});
    if(action==='poll'){
      if(failPoll)throw new TypeError('Failed to fetch');
      const state=states.shift()||'waiting';return Response.json({state,...(state==='logged_in'?{loggedIn:true,user:{name:'Tester',vip:true}}:{})});
    }
    if(action==='logout'||action==='cancel')return Response.json({loggedIn:false});
    throw new Error('Unexpected action');
  };
  const login=initBilibiliLogin({api:new URL('https://tool.example/tools/media/bilibili/api/'),t:zh=>zh,onSessionChange:value=>changes.push(value)});
  return {element,tasks,calls,changes,qrs,events,login,async tick(){const [key,task]=tasks.entries().next().value;tasks.delete(key);await task.callback();}};
}
test('QR state flow renders locally, polls every three seconds and automatically updates parsing session',async t=>{
  const h=harness(t);await setImmediate();
  await h.element('qr-login-button').events.click();
  assert.equal(h.element('qr-login-panel').hidden,false);assert.equal(h.qrs.length,1);
  assert.equal([...h.tasks.values()][0].delay,3000);
  await h.tick();assert.match(h.element('qr-login-status').textContent,/扫描二维码/);
  await h.tick();assert.match(h.element('qr-login-status').textContent,/手机上确认/);
  await h.tick();assert.equal(h.element('qr-login-panel').hidden,true);assert.match(h.element('login-status').textContent,/Tester/);
  assert.equal(h.element('sessdata').value,'');assert.deepEqual(h.changes,[true]);assert.equal([...h.tasks.values()][0].delay,15*60000);
  await h.element('logout-button').events.click();assert.deepEqual(h.changes,[true,false]);assert.equal(h.element('logout-button').hidden,true);
  assert.ok(h.calls.every(c=>c.options.credentials==='same-origin'));
  assert.ok(h.calls.filter(c=>c.action!=='status').every(c=>c.options.method==='POST'&&c.options.body==='{}'));
});
test('Cancel stops polling, clears the QR and busy mode prevents starting another login',async t=>{
  const h=harness(t);await setImmediate();h.login.setBusy(true);
  await h.element('qr-login-button').events.click();assert.equal(h.qrs.length,0);
  h.login.setBusy(false);await h.element('qr-login-button').events.click();assert.equal(h.tasks.size,1);
  await h.element('qr-cancel-button').events.click();assert.equal(h.tasks.size,0);assert.equal(h.element('qr-login-panel').hidden,true);
  assert.equal(h.calls.at(-1).action,'cancel');
});
test('Expired QR stops before polling Bilibili and allows refresh',async t=>{
  const h=harness(t,{expired:true});await setImmediate();await h.element('qr-login-button').events.click();await h.tick();
  assert.equal(h.element('qr-login-panel').dataset.state,'expired');assert.equal(h.calls.filter(c=>c.action==='poll').length,0);
  await h.element('qr-refresh-button').events.click();assert.equal(h.qrs.length,2);
});
test('Network errors stop automatic polling and remain recoverable with refresh',async t=>{
  const h=harness(t,{failPoll:true});await setImmediate();await h.element('qr-login-button').events.click();await h.tick();
  assert.equal(h.element('qr-login-panel').dataset.state,'error');assert.equal(h.tasks.size,0);assert.equal(h.element('qr-refresh-button').disabled,false);
  await h.element('qr-refresh-button').events.click();assert.equal(h.qrs.length,2);
});
test('Confirmed Bilibili login renews while page is open, and page exit stops renewal',async t=>{
  const h=harness(t,{states:['logged_in']});await setImmediate();await h.element('qr-login-button').events.click();await h.tick();
  assert.equal([...h.tasks.values()][0].delay,15*60000);
  await h.tick();assert.equal(h.calls.at(-1).action,'renew');assert.equal([...h.tasks.values()][0].delay,15*60000);
  h.events.pagehide();assert.equal(h.tasks.size,0);assert.match(h.element('login-status').textContent,/Tester/);
});
test('Temporary renewal failure retains the login and schedules a retry',async t=>{
  const h=harness(t,{states:['logged_in'],failRenew:true});await setImmediate();await h.element('qr-login-button').events.click();await h.tick();await h.tick();
  assert.equal(h.element('logout-button').hidden,false);assert.match(h.element('login-status').textContent,/已保留/);assert.equal([...h.tasks.values()][0].delay,60000);
});
