import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Input, BufferSource, MP4, EncodedPacketSink } from '../../../assets/vendor/mediabunny-1.62.1/mediabunny.min.mjs';
import { muxMp4 } from '../scripts/bilibili-mux.mjs';

const video = new Uint8Array(await readFile(new URL('./fixtures/video.mp4',import.meta.url)));
const audio = new Uint8Array(await readFile(new URL('./fixtures/audio.m4a',import.meta.url)));
const urls = {videoUrl:'https://fixture.test/video.mp4',audioUrl:'https://fixture.test/audio.m4a'};
function mockFetch(t) {
  const original = globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch = async (url,init) => {
    const data = String(url).includes('audio') ? audio : video;
    const range = new Headers(init?.headers).get('range');
    const match = range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]),data.length-1) : data.length-1;
    return new Response(data.slice(start,end+1),{status:range?206:200,headers:{'Content-Type':'video/mp4','Content-Length':String(end-start+1),'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${data.length}`}:{})}});
  };
}
async function inspect(data) {
  const input = new Input({source:new BufferSource(data),formats:[MP4]});
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    assert.equal(videoTrack.codec,'avc'); assert.equal(audioTrack.codec,'aac');
    assert.equal(videoTrack.displayWidth,96); assert.equal(videoTrack.displayHeight,64);
    assert.ok(Math.abs(await input.computeDuration()-1)<0.1);
    let videoPackets=0,audioPackets=0;
    for await (const packet of new EncodedPacketSink(videoTrack).packets()) {assert.ok(packet.data.byteLength>0);videoPackets++;}
    for await (const packet of new EncodedPacketSink(audioTrack).packets()) {assert.ok(packet.data.byteLength>0);audioPackets++;}
    assert.equal(videoPackets,12);assert.ok(audioPackets>=47);
  } finally { input.dispose(); }
}
test('Real H.264 + AAC samples merge into a playable MP4 without transcoding',async t => {
  mockFetch(t); const progress=[];
  const blob = await muxMp4({...urls,duration:1,onProgress:f=>progress.push(f)});
  assert.equal(blob.type,'video/mp4');assert.equal(progress.at(-1),1);
  await inspect(new Uint8Array(await blob.arrayBuffer()));
});
test('Disk output uses positional writes and leaves commit/abort to caller',async t => {
  mockFetch(t); const chunks=[]; let closed=false;
  const writable={async write(chunk){chunks.push(chunk);},async close(){closed=true;}};
  const result = await muxMp4({...urls,duration:1,writable});
  assert.equal(result,null);assert.equal(closed,false);assert.ok(chunks.length>0);
  const buffer = new Uint8Array(Math.max(...chunks.map(c=>c.position+c.data.length)));
  for (const chunk of chunks) buffer.set(chunk.data,chunk.position);
  await inspect(buffer);
});
test('Abort stops remuxing before a successful output is returned',async t => {
  mockFetch(t);const controller=new AbortController();
  await assert.rejects(muxMp4({...urls,duration:1,signal:controller.signal,onProgress:()=>controller.abort()}));
});
