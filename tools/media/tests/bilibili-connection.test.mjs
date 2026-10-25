import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../scripts/bilibili-connection.js',import.meta.url),'utf8');
function boot(protocol) {
  const elements = new Map();
  const document = {getElementById(id) {if (!elements.has(id)) elements.set(id,{hidden:true,disabled:false,dataset:{},addEventListener(name,callback){this[name]=callback;}});return elements.get(id);}};
  const context = {window:{},location:{protocol},document};
  vm.runInNewContext(source,context);
  return {...context,elements};
}
test('file opening shows a usable HTTP entry and disables unsupported parsing',() => {
  const {window,elements} = boot('file:');
  assert.equal(window.PHDSXVideoConnection.isFile,true);
  assert.equal(elements.get('file-mode-help').hidden,false);
  assert.match(elements.get('parse-status').textContent,/启动本地服务/);
  for (const id of ['parse-button','paste-button','video-url','sessdata']) assert.equal(elements.get(id).disabled,true);
  let prevented=false;elements.get('parse-form').submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
});
test('HTTP keeps the form usable and gives actionable network errors',() => {
  const {window,elements} = boot('http:');
  assert.equal(elements.size,0);
  assert.equal(window.PHDSXVideoConnection.isFile,false);
  assert.match(window.PHDSXVideoConnection.errorMessage({name:'TypeError',message:'Failed to fetch'}),/本地服务仍在运行/);
  assert.match(window.PHDSXVideoConnection.errorMessage({name:'Error',message:'NetworkError when attempting to fetch resource'}),/无法连接解析服务/);
  assert.equal(window.PHDSXVideoConnection.errorMessage(new Error('视频已被删除')),'视频已被删除');
});
