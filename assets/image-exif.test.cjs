const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {}, Uint8Array, DataView, Blob };
vm.runInNewContext(fs.readFileSync(require.resolve('./image-exif.js'), 'utf8'), context);
const { preserveExif } = context.window.PHDSXImageExif;

function makeTiff() {
  const bytes = new Uint8Array(43);
  const view = new DataView(bytes.buffer);
  bytes.set([73, 73]);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);
  view.setUint16(10, 274, true); // Orientation
  view.setUint16(12, 3, true);
  view.setUint32(14, 1, true);
  view.setUint16(18, 6, true);
  view.setUint16(22, 271, true); // Make
  view.setUint16(24, 2, true);
  view.setUint32(26, 5, true);
  view.setUint32(30, 38, true);
  bytes.set([84, 69, 83, 84, 0], 38);
  return bytes;
}

const tiff = makeTiff();
const source = new Blob([new Uint8Array([255, 216, 255, 225, 0, tiff.length + 8, 69, 120, 105, 102, 0, 0]), tiff, new Uint8Array([255, 217])], { type: 'image/jpeg' });
const jpegOutput = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
const pngOutput = new Blob([new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
])], { type: 'image/png' });

test('JPEG output retains EXIF fields and clears orientation after canvas rotation', async () => {
  const output = await preserveExif(source, jpegOutput);
  const bytes = new Uint8Array(await output.arrayBuffer());
  assert.equal(bytes[3], 225);
  assert.equal((bytes[4] << 8) | bytes[5], tiff.length + 8);
  const stored = new DataView(bytes.buffer, 12);
  assert.equal(stored.getUint16(18, true), 1);
  assert.equal(String.fromCharCode(...bytes.slice(50, 54)), 'TEST');
  assert.deepEqual([...bytes.slice(-2)], [255, 217]);
});

test('PNG output receives a valid eXIf chunk with preserved fields', async () => {
  const output = await preserveExif(source, pngOutput);
  const bytes = new Uint8Array(await output.arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(37, 41)), 'eXIf');
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(33), tiff.length);
  assert.equal(view.getUint16(8 + 25 + 8 + 18, true), 1);
  assert.equal(String.fromCharCode(...bytes.slice(33 + 8 + 38, 33 + 8 + 42)), 'TEST');
  assert.deepEqual([...bytes.slice(-12)], [...new Uint8Array(await pngOutput.arrayBuffer()).slice(-12)]);
});

test('files without EXIF are left unchanged', async () => {
  assert.equal(await preserveExif(jpegOutput, pngOutput), pngOutput);
});
