const test = require('node:test');
const assert = require('node:assert/strict');
const { scale2x } = require('./display-enhance.js');

test('uniform pixels are enlarged without changing their color', () => {
  const source = new Uint32Array([0xff102030, 0xff102030, 0xff102030, 0xff102030]);
  const result = scale2x(source, 2, 2);
  assert.equal(result.length, 16);
  assert.ok(result.every(pixel => pixel === 0xff102030));
  assert.equal(source.length, 4);
});

test('Scale2x rounds a diagonal corner while preserving other pixels', () => {
  const source = new Uint32Array([
    0, 1, 0,
    1, 0, 0,
    0, 0, 0
  ]);
  const result = scale2x(source, 3, 3);
  const center = 2 * 6 + 2;
  assert.deepEqual([result[center], result[center + 1], result[center + 6], result[center + 7]], [1, 0, 0, 0]);
  assert.equal(source[4], 0);
});
