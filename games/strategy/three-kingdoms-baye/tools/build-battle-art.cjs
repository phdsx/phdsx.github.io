// Extract only the original battle terrain and unit sprites as display metadata.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lib = fs.readFileSync(path.join(root, 'assets/dictionary-original.lib'));

function picture(id) {
  const entry = lib.readUInt32LE((id - 1) * 4);
  const length = lib.readUInt32LE(entry + 8);
  const source = lib.subarray(entry + 14, entry + 14 + length);
  const width = source.readUInt16LE(0), height = source.readUInt16LE(2);
  const count = source.readUInt16LE(4), mask = source[6];
  const bytesPerSprite = Math.ceil(width / 8) * height * (mask & 1 ? 2 : 1);
  const expected = id === 9 ? [12, 12, 5] : id === 4 ? [16, 16, 46] : [16, 16, 32];
  if (width !== expected[0] || height !== expected[1] || count !== expected[2] ||
      source.length !== 7 + count * bytesPerSprite) {
    throw Error(`Unexpected original battle picture ${id}`);
  }
  return { width, height, count, mask, bits: source.subarray(7).toString('base64') };
}

const data = { terrain: picture(4), units: picture(5), weather: picture(9) };
fs.writeFileSync(path.join(root, 'assets/battle-art-data.js'),
  '// Generated from dictionary-original.lib by tools/build-battle-art.cjs.\nwindow.BayeBattleData = ' + JSON.stringify(data) + ';\n');
console.log(`Extracted ${data.terrain.count} terrain tiles and ${data.units.count} unit sprites.`);
