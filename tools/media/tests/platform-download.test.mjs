import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadPlatformVideo} from '../scripts/platform-download.mjs';
const api=new URL('https://tool.example/tools/media/video/api/');
test('Prepared download saves MP4 and releases the server file after browser receives it',async t=>{
  const calls=[];const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async(url,options)=>{
    options.signal?.throwIfAborted();const pathname=new URL(url).pathname;calls.push({pathname,options});
    if(pathname.endsWith('/file'))return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Length':'3'}});
    if(pathname.endsWith('/jobs'))return Response.json({id:'job'});
    return Response.json({state:'ready',progress:100});
  };
  const blob=await downloadPlatformVideo({api,sessionId:'session',formatId:'1080',signal:new AbortController().signal});
  assert.equal(blob.type,'video/mp4');assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[1,2,3]);assert.ok(calls.at(-1).pathname.endsWith('/release'));
  assert.ok(calls.every(c=>c.options.credentials==='same-origin'));
});
test('Cancel during server preparation cancels the job instead of saving a partial file',async t=>{
  const calls=[];const controller=new AbortController(),original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async(url,options)=>{
    options.signal?.throwIfAborted();const pathname=new URL(url).pathname;calls.push(pathname);
    if(pathname.endsWith('/jobs'))return Response.json({id:'job'});
    return Response.json({state:'ready',progress:100});
  };
  await assert.rejects(downloadPlatformVideo({api,sessionId:'session',formatId:'1080',signal:controller.signal,onProgress:()=>controller.abort()}));
  assert.ok(calls.at(-1).endsWith('/cancel'));assert.ok(!calls.some(p=>p.endsWith('/file')));
});
