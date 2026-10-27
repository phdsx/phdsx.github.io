import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlatformSessions,PLATFORM_AUTH} from '../scripts/platform-sessions.mjs';

test('Manual credentials belong to four separate platforms and survive arbitrary switching',()=>{
  const sessions=createPlatformSessions();
  for(const platform of Object.keys(PLATFORM_AUTH))sessions.setCredential(platform,`${platform}-own-secret`);
  for(let pass=0;pass<5;pass++)for(const platform of ['youtube','douyin','bilibili','xiaohongshu'])assert.equal(sessions.get(platform).credential,`${platform}-own-secret`);
  sessions.clearCredential('douyin');
  assert.equal(sessions.get('douyin').credential,'');
  assert.equal(sessions.get('youtube').credential,'youtube-own-secret');
  assert.equal(sessions.get('bilibili').credential,'bilibili-own-secret');
});
test('QR account state stays with its own provider, independent of manual credentials',()=>{
  const sessions=createPlatformSessions();
  sessions.setQrUser('bilibili',{name:'B站账号',vip:true});
  sessions.setCredential('douyin','douyin-cookie');sessions.clearCredential('douyin');
  assert.equal(sessions.get('bilibili').qrUser.name,'B站账号');
  for(const platform of ['douyin','xiaohongshu']){assert.equal(sessions.get(platform).qrUser,null);sessions.setQrUser(platform,{name:platform+'账号'});assert.equal(sessions.get(platform).qrUser.name,platform+'账号');}
  assert.throws(()=>sessions.setQrUser('youtube',{name:'其他账号'}));
  sessions.setQrUser('douyin',null);assert.equal(sessions.get('xiaohongshu').qrUser.name,'xiaohongshu账号');
  const copy=sessions.get('bilibili');copy.qrUser.name='changed';assert.equal(sessions.get('bilibili').qrUser.name,'B站账号');
});
test('Page memory retains manual credentials without timers and a refreshed page starts empty',()=>{
  const sessions=createPlatformSessions();sessions.setCredential('douyin','keep-until-refresh');sessions.markUsed('douyin');
  const original=Date.now;try{Date.now=()=>original()+90*86400000;assert.equal(sessions.get('douyin').credential,'keep-until-refresh');assert.equal(sessions.get('douyin').used,true);}finally{Date.now=original;}
  assert.equal(createPlatformSessions().get('douyin').credential,'');
  sessions.clearAll();for(const platform of Object.keys(PLATFORM_AUTH))assert.deepEqual(sessions.get(platform),{credential:'',used:false,qrUser:null});
});
