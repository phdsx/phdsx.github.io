import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaGateway,MEDIA_API_PREFIX} from '../../../worker/video-gateway.mjs';
test('Hosted gateway requires configured external service and rejects cross-site calls',async()=>{
  assert.equal((await mediaGateway(new Request('https://site.example'+MEDIA_API_PREFIX+'health'))).status,503);
  assert.equal((await mediaGateway(new Request('https://site.example'+MEDIA_API_PREFIX+'health',{headers:{Origin:'https://evil.example'}}))).status,403);
});
test('Gateway forwards only generic session cookie and keeps service key server-side',async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let captured;
  globalThis.fetch=async(url,options)=>{captured={url,options};return Response.json({ok:true},{headers:{'Set-Cookie':'phdsx_video_client='+ 'b'.repeat(64)+'; HttpOnly; Secure; SameSite=Strict'}});};
  const response=await mediaGateway(new Request('https://site.example'+MEDIA_API_PREFIX+'health',{headers:{Cookie:'phdsx_bili_session=private; phdsx_video_client='+ 'a'.repeat(64)+'; unrelated=value'}}),{VIDEO_SERVICE_URL:'https://video.example',VIDEO_SERVICE_KEY:'private-service-key'});
  assert.equal(response.status,200);assert.equal(captured.url.origin,'https://video.example');
  assert.equal(captured.options.headers.get('cookie'),'phdsx_video_client='+ 'a'.repeat(64));
  assert.equal(captured.options.headers.get('x-video-service-key'),'private-service-key');
  assert.ok(!JSON.stringify(await response.json()).includes('private-service-key'));
  assert.match(response.headers.get('set-cookie'),/^phdsx_video_client=/);
});
