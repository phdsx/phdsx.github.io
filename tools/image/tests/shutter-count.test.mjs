import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { metadataArgs, summarizeMetadata, validateFile } from '../shutter-count-core.mjs';

test('keeps mechanical and total counts distinct, including zero', () => {
  const result = summarizeMetadata({ 'IFD0:Model': 'Nikon test', 'Nikon:ShutterCount': 100,
    'Nikon:MechanicalShutterCount': 0, 'Nikon:ImageCount': 90 });
  assert.deepEqual(result.counters.map(c => [c.tag, c.value]), [
    ['MechanicalShutterCount', 0], ['ShutterCount', 100], ['ImageCount', 90]
  ]);
});

test('never interprets sequence numbers, XMP, null or malformed counters as shutter count', () => {
  const result = summarizeMetadata({ 'Canon:ImageNumber': 9999, 'IFD0:ImageCount': 99,
    'XMP-exif:ShutterCount': 12345, 'Nikon:ShutterCount': null,
    'Sony:ShutterCount': 'Unknown', 'Sony:ShutterCount2': -1,
    'Pentax:ShutterCount': '', 'FujiFilm:ImageCount': 2.5,
    'Sony:ShutterCount3': Number.MAX_SAFE_INTEGER + 1 });
  assert.equal(result.counters.length, 0);
  assert.equal(summarizeMetadata({ 'FujiFilm:ImageCount': '123' }).counters[0].label, '图像计数');
  assert.equal(summarizeMetadata({ 'Nikon:ShutterCount': '0' }).counters[0].value, 0);
});

test('reports missing data and parse warnings without inventing camera details', () => {
  const result = summarizeMetadata({ 'ExifTool:Warning': 'Invalid maker notes' });
  assert.equal(result.model, '');
  assert.equal(result.counters.length, 0);
  assert.deepEqual(result.warnings, ['Invalid maker notes']);
});

test('accepts original photo formats, rejects oversized, empty or unrelated files', () => {
  for (const name of ['photo.JPG', 'photo.NEF', 'photo.CR3', 'photo.ARW', 'photo.RAF', 'photo.PEF', 'photo.DNG']) {
    assert.equal(validateFile({ name, size: 100 }), '');
  }
  assert.ok(validateFile({ name: 'photo.jpg', size: 0 }));
  assert.ok(validateFile({ name: 'photo.jpg', size: 200 * 1024 * 1024 + 1 }));
  assert.ok(validateFile({ name: 'photo.png', size: 100 }));
});

// Original synthetic TIFF fixture: Nikon type-3 maker note with its own TIFF
// origin and a big-endian counter. No copyrighted photo needs to be shipped.
function nikonFixture() {
  const data = Buffer.alloc(192);
  data.write('II'); data.writeUInt16LE(42, 2); data.writeUInt32LE(8, 4);
  data.writeUInt16LE(3, 8);
  const entry = (offset, tag, type, count, value) => {
    data.writeUInt16LE(tag, offset); data.writeUInt16LE(type, offset + 2);
    data.writeUInt32LE(count, offset + 4); data.writeUInt32LE(value, offset + 8);
  };
  entry(10, 0x010f, 2, 6, 50); data.write('NIKON\0', 50);
  entry(22, 0x0110, 2, 8, 56); data.write('TEST D70', 56);
  entry(34, 0x8769, 4, 1, 70);
  data.writeUInt16LE(1, 70);
  entry(72, 0x927c, 7, 36, 100);
  data.write('Nikon\0', 100); data[106] = 2; data[107] = 0x10;
  data.write('MM', 110); data.writeUInt16BE(42, 112); data.writeUInt32BE(8, 114);
  data.writeUInt16BE(1, 118); data.writeUInt16BE(0x00a7, 120);
  data.writeUInt16BE(4, 122); data.writeUInt32BE(1, 124); data.writeUInt32BE(526, 128);
  return data;
}

test('the shipped WASM engine reads Nikon maker notes from binary TIFF bytes', async () => {
  // Upstream's Node path handling does not support Windows drive URLs. Select
  // its browser loader and supply local WASM bytes; production uses a Worker.
  const old = globalThis.importScripts;
  globalThis.importScripts = () => {};
  const { parseMetadata, dispose } = await import('../../../assets/vendor/exiftool-wasm-1.0.4/index.js');
  try {
    const result = await parseMetadata(new File([nikonFixture()], 'synthetic.tif'), {
      args: metadataArgs, transform: JSON.parse,
      fetch: async () => new Response(await readFile(new URL('../../../assets/vendor/exiftool-wasm-1.0.4/zeroperl-mqcadjqm.wasm', import.meta.url)))
    });
    assert.equal(result.success, true, result.error);
    const summary = summarizeMetadata(result.data[0]);
    assert.equal(summary.make, 'NIKON');
    assert.equal(summary.counters[0]?.value, 526);
    assert.equal(summary.counters[0]?.key, 'Nikon:ShutterCount');
  } finally {
    await dispose();
    if (old === undefined) delete globalThis.importScripts; else globalThis.importScripts = old;
  }
});
