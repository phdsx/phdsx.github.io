import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVideoInput} from '../scripts/video-platforms.mjs';
test('Detect four platforms, share text, Shorts, modal IDs and preserve Xiaohongshu share token',()=>{
  assert.equal(parseVideoInput('BV1xx411c7mD').platform,'bilibili');
  assert.equal(parseVideoInput('分享视频 https://v.douyin.com/abc123/ 复制打开抖音').short,true);
  assert.equal(parseVideoInput('https://www.douyin.com/?modal_id=6961737553342991651').url,'https://www.douyin.com/video/6961737553342991651');
  assert.equal(parseVideoInput('https://www.iesdouyin.com/share/video/6961737553342991651/').platform,'douyin');
  assert.equal(parseVideoInput('https://xhslink.com/a/abc123').short,true);
  const xhs=parseVideoInput('https://www.xiaohongshu.com/discovery/item/674051740000000007027a15?xsec_token=abc%3D&share=tracking');
  assert.equal(new URL(xhs.url).searchParams.get('xsec_token'),'abc=');assert.equal(new URL(xhs.url).searchParams.has('share'),false);
  for(const url of ['https://youtu.be/jNQXAC9IVRw?t=1','https://www.youtube.com/shorts/jNQXAC9IVRw','https://www.youtube.com/watch?v=jNQXAC9IVRw&list=abc'])assert.deepEqual(parseVideoInput(url),{platform:'youtube',url:'https://www.youtube.com/watch?v=jNQXAC9IVRw'});
});
test('Reject spoofed hosts, credentials, local addresses, channels and collections',()=>{
  for(const url of ['https://youtube.com.evil.example/watch?v=jNQXAC9IVRw','https://127.0.0.1/video/1','https://www.youtube.com:8080/watch?v=jNQXAC9IVRw','https://u:p@youtu.be/jNQXAC9IVRw','https://www.youtube.com/@channel','https://www.youtube.com/playlist?list=abc','https://www.douyin.com/user/abc','https://www.xiaohongshu.com/user/profile/123'])assert.throws(()=>parseVideoInput(url));
});
