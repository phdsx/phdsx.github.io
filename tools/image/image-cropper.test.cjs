const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('./image-cropper.html'), 'utf8');
const source = html.slice(html.indexOf('function syncCropWithSelectedImage() {'), html.indexOf('// Pre-defined ratio buttons click handler'));

test('ratio changes update the exported crop, while free mode keeps the rectangle', () => {
  const context = {
    currentImageIndex: 0, allImages: [{ crop: { x: 10, y: 20, w: 200, h: 100 } }],
    cropX: 10, cropY: 20, cropW: 200, cropH: 100, cropRatio: 1,
    mainCanvas: { width: 300, height: 150 }, updateCropBox() {}
  };
  vm.runInNewContext(source, context);
  context.applyCropRatio();
  assert.equal(context.cropW, 130);
  assert.equal(context.cropH, 130);
  assert.equal(context.allImages[0].crop.w, 130);
  assert.equal(context.allImages[0].crop.h, 130);
  context.cropRatio = 0;
  context.applyCropRatio();
  assert.equal(context.cropW, 130);
  assert.equal(context.allImages[0].crop.w, 130);
});
