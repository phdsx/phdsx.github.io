const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createTracker, unitKind } = require('./battle-art.js');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('./assets/battle-art-data.js'), 'utf8'), context);
const source = context.window.BayeBattleData;
const terrain = Buffer.from(source.terrain.bits, 'base64');
const units = Buffer.from(source.units.bits, 'base64');
const width = 160, height = 96;
const rgba = new Uint8ClampedArray(width * height * 4);
function set(x, y, ink) {
  const p = (y * width + x) * 4;
  rgba[p] = rgba[p + 1] = rgba[p + 2] = ink ? 0 : 255;
  rgba[p + 3] = 255;
}
function bit(bits, offset, x, y) { return !!(bits[offset + y * 2 + (x >> 3)] & (128 >> (x & 7))); }
function draw(tracker, resource, index, x, y) {
  tracker.event(15, resource, 0, index + 1, x, y);
  tracker.event(9, x, y, x + 15, y + 15);
  for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) {
    const px = x + dx, py = y + dy;
    if (px < 0 || py < 0 || px >= width || py >= height) continue;
    if (resource === 4) set(px, py, bit(terrain, index * 32, dx, dy));
    else {
      const p = (py * width + px) * 4;
      set(px, py, (rgba[p] === 0 && bit(units, index * 64, dx, dy)) || bit(units, index * 64 + 32, dx, dy));
    }
  }
}

test('open field and fort tiles remain identifiable after unit compositing and map redraw', () => {
  const tracker = createTracker(source);
  for (let y = 0; y < 80; y += 16) for (let x = 0; x < 160; x += 16) draw(tracker, 4, 1, x, y);
  for (let x = 16; x <= 128; x += 16) draw(tracker, 5, 28, x, 32);
  let frame = tracker.visible(rgba);
  assert.equal(frame.active, true);
  assert.equal(frame.tiles.length, 50);
  assert.equal(frame.troops.length, 8);

  // Redrawing the fortress removes old troop records under newly drawn terrain.
  for (let y = 16; y <= 48; y += 16) for (let x = 48; x <= 112; x += 16)
    draw(tracker, 4, y === 16 || y === 48 ? 16 : 17, x, y);
  for (const x of [64, 80, 96]) draw(tracker, 5, 28, x, 32);
  frame = tracker.visible(rgba);
  assert.equal(frame.active, true);
  assert.ok(frame.fort >= 6);
  assert.equal(frame.tiles.length, 50);
  assert.equal(frame.troops.length, 6, 'old units under newly drawn terrain are removed');
  assert.equal(unitKind(28), 'cavalry');
});
