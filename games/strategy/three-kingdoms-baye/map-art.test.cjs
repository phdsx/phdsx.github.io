const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createTracker, relation, factionLabel, portraitSource } = require('./map-art.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('./assets/map-art-data.js'), 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.BayeMapData));
function fixture() {
  let memory = new ArrayBuffer(3000000);
  const v = new DataView(memory), bytes = new Uint8Array(memory), m = data.memory;
  bytes[m.mapWidth] = 12; bytes[m.mapHeight] = 9; bytes[m.period] = 1;
  v.setUint16(m.player, 5, true); v.setUint16(m.cities + 1, 6, true);
  bytes.set([0, 0, 1, 0], 2900000);
  const tracker = createTracker(data, () => memory), rgba = new Uint8Array(160 * 96 * 4);
  function draw(resource, index, x, y) {
    const p = data.pictures[resource], size = Math.ceil(p.w / 8) * p.h, bits = Buffer.from(p.bits, 'base64').subarray(size * index, size * (index + 1));
    new Uint8Array(memory).set(bits, 2910000);
    tracker.event(15, resource, 0, index + 1, x, y, 0);
    tracker.event(9, x, y, x + p.w - 1, y + p.h - 1, 2910000, 0, 1, 1);
    for (let row = 0; row < p.h; row++) for (let col = 0; col < p.w; col++) {
      const q = ((y + row) * 160 + x + col) * 4;
      rgba.set([0, 0, 0, bits[row * Math.ceil(p.w / 8) + (col >> 3)] & (128 >> (col % 8)) ? 255 : 0], q);
    }
  }
  return { tracker, bytes, v, rgba, draw, memory, grow() { const next = new Uint8Array(4000000); next.set(new Uint8Array(memory)); memory = next.buffer; } };
}
test('all city locations are the original C_MAP resource and links contain only original destinations', () => {
  const b = fs.readFileSync(require.resolve('./assets/dictionary-original.lib'));
  const p = b.readUInt32LE(4), offset = b.readUInt32LE(p + 14 + 13 * 8), length = b.readUInt32LE(p + 18 + 13 * 8);
  assert.deepEqual(data.grid, [...b.subarray(p + offset, p + offset + length)]);
  assert.equal(new Set(data.grid.filter(Boolean)).size, 38);
  for (const links of data.links) for (const target of links) assert.ok(target >= 0 && target < 38);
});
test('ownership is read live, zero is unowned, and frame type must agree with actual allegiance', () => {
  const f = fixture(), before = f.bytes.slice();
  const initial = f.tracker.readMap(2900000);
  assert.equal(initial.owners[0], 6); assert.deepEqual(f.bytes, before, 'memory is never modified by observation');
  f.tracker.event(16, 2900000); f.draw(55, 8, 20, 4);
  assert.equal(f.tracker.visible(f.rgba).records[0].city.state, 'own');
  f.v.setUint16(data.memory.cities + 1, 1, true);
  f.tracker.event(16, 2900000); f.draw(55, 7, 20, 4);
  let city = f.tracker.visible(f.rgba).records[0].city;
  assert.equal(city.state, 'enemy'); assert.equal(city.faction, '董卓');
  f.v.setUint16(data.memory.cities + 1, 0, true);
  f.tracker.event(16, 2900000); f.draw(55, 0, 20, 4);
  assert.equal(f.tracker.visible(f.rgba).records[0].city.state, 'unowned');
  f.draw(55, 8, 20, 4); assert.equal(f.tracker.visible(f.rgba).records[0].city, undefined, 'mismatched icon cannot fabricate ownership');
});
test('same-surname factions get full names, and compound surnames remain intact', () => {
  const names = ['刘备', '刘表', '公孙瓒', '曹操'];
  assert.equal(factionLabel(1, names, [1, 2, 3, 4]), '刘备');
  assert.equal(factionLabel(2, names, [1, 2, 3, 4]), '刘表');
  assert.equal(factionLabel(3, names, [1, 2, 3, 4]), '公孙');
  assert.equal(factionLabel(4, names, [1, 2, 3, 4]), '曹');
  assert.equal(relation(0, 0), 'unowned');
});
test('scrolling uses the original viewport and city anchors rather than concept-image positions', () => {
  const f = fixture(); f.bytes.set([4, 2, 5, 2], 2900000);
  f.v.setUint16(data.memory.cities + 10 * 37 + 1, 1, true);
  f.tracker.event(16, 2900000); f.draw(54, 28, 0, 0); f.draw(55, 7, 20, 4);
  const r = f.tracker.visible(f.rgba).records.find(r => r.city);
  assert.equal(r.city.name, '长安'); assert.deepEqual([r.x, r.y], [20, 4]);
  assert.deepEqual([r.map.x, r.map.y], [4, 2]);
});
test('screen copies, menu clears and restores preserve artwork occlusion', () => {
  const f = fixture(); f.tracker.event(1, 500); f.draw(54, 0, 0, 0); f.tracker.event(2, 500); f.tracker.event(3);
  f.tracker.event(1, 0); f.tracker.event(5, 4, 4, 11, 11);
  let visible = f.tracker.visible(f.rgba);
  assert.equal(visible.pixels[5 * 160 + 5], 0); assert.ok(visible.pixels[0]);
  f.tracker.event(4); visible = f.tracker.visible(f.rgba); assert.ok(visible.pixels[5 * 160 + 5]);
  f.tracker.event(5, 0, 0, 159, 95); assert.equal(f.tracker.visible(f.rgba).records.length, 0);
});
test('unnotified overwrites and offscreen writes cannot expose stale artwork', () => {
  const f = fixture(); f.draw(54, 0, 0, 0); const before = f.tracker.visible(f.rgba);
  f.tracker.event(5, -20, 0, -1, 5); assert.deepEqual(f.tracker.visible(f.rgba).pixels, before.pixels);
  f.rgba[3] = 255 - f.rgba[3]; assert.equal(f.tracker.visible(f.rgba).pixels[0], 0);
});
test('memory growth and invalid period or geometry safely fall back', () => {
  const f = fixture(); f.grow(); assert.equal(f.tracker.readMap(2900000).owners[0], 6);
  assert.equal(f.tracker.readMap(9000000), null);
  const bad = fixture(); bad.bytes[data.memory.period] = 8; assert.equal(bad.tracker.readMap(2900000), null);
  bad.bytes[data.memory.period] = 1; bad.bytes[data.memory.mapWidth] = 20; assert.equal(bad.tracker.readMap(2900000), null);
});
test('all 33 starting-ruler identities map to separate atlas slots across all four scripts', () => {
  assert.equal(data.rulers.length, 33);
  data.rulers.forEach((r, slot) => assert.equal(data.portraitSlots[48 + r.period][r.index], slot));
  assert.equal(data.portraitSlots[48][5], data.portraitSlots[50][7], 'Ma Teng keeps the same identity across scripts');
});

test('Han Sui and the twelve added officers resolve by original bitmap across scripts', () => {
  assert.ok(data.portraits.length >= 45);
  const manifest = JSON.parse(fs.readFileSync(require.resolve('./assets/hd/general-portraits.json')));
  const subjects = manifest.sheets[0].subjects;
  subjects.forEach((subject, cell) => {
    const referenceIndex = data.names[subject.period].indexOf(subject.name);
    const bits = Buffer.from(data.pictures[48 + subject.period].bits, 'base64').subarray(referenceIndex * 72, (referenceIndex + 1) * 72);
    for (let period = 0; period < 4; period++) {
      const pictures = Buffer.from(data.pictures[48 + period].bits, 'base64');
      for (let index = 0; index < 200; index++) {
        if (!bits.equals(pictures.subarray(index * 72, (index + 1) * 72))) continue;
        assert.deepEqual(portraitSource(data, 48 + period, index), {
          file: 'generals-1.png', columns: 3, rows: 4, column: cell % 3, row: Math.floor(cell / 3)
        });
      }
    }
  });
  assert.equal(portraitSource(data, 48, 200), null, 'out-of-range officers cannot borrow another face');
  assert.equal(portraitSource(data, 55, 0), null, 'city sprites cannot resolve as portraits');
});

test('every portrait resource in all four scripts has its own matching remastered source', () => {
  const byFingerprint = new Map(), bySlot = new Map();
  for (let resource = 48; resource <= 51; resource++) {
    const bits = Buffer.from(data.pictures[resource].bits, 'base64');
    for (let index = 0; index < data.pictures[resource].count; index++) {
      const key = bits.subarray(index * 72, (index + 1) * 72).toString('hex');
      const source = portraitSource(data, resource, index), slot = data.portraitSlots[resource][index];
      assert.ok(source, `missing portrait ${resource}:${index} ${data.names[resource - 48][index]}`);
      if (byFingerprint.has(key)) assert.equal(slot, byFingerprint.get(key));
      if (bySlot.has(slot)) assert.equal(key, bySlot.get(slot), 'different source faces cannot share a replacement');
      byFingerprint.set(key, slot); bySlot.set(slot, key);
      assert.ok(source.column < source.columns && source.row < source.rows);
    }
  }
  assert.equal(byFingerprint.size, 298);
  assert.equal(bySlot.size, 298);
  for (const sheet of data.portraitSheets) {
    const png = fs.readFileSync(require.resolve(`./assets/hd/${sheet.file}`));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.ok(png.readUInt32BE(16) / sheet.columns >= 250, `${sheet.file} has insufficient detail`);
    assert.ok(png.readUInt32BE(20) / sheet.rows >= 250, `${sheet.file} has insufficient detail`);
    assert.ok(sheet.count <= sheet.columns * sheet.rows);
  }
});

test('event-dialog portraits resolve without a map and survive screen backup/restore', () => {
  const f = fixture(), index = data.names[0].indexOf('韩遂');
  f.tracker.event(5, 10, 42, 150, 88);
  f.draw(48, index, 20, 48);
  const record = f.tracker.visible(f.rgba).records[0];
  assert.equal(record.map, null);
  assert.equal(record.index, index);
  assert.equal(portraitSource(data, record.resource, record.index).file, 'generals-1.png');
  f.tracker.event(3);
  f.tracker.event(5, 10, 42, 150, 88);
  assert.equal(f.tracker.visible(f.rgba).records.length, 0);
  f.tracker.event(4);
  assert.equal(f.tracker.visible(f.rgba).records[0].index, index);
});
