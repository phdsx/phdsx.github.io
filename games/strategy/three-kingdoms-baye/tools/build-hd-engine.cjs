// Adds read-only drawing notifications to the shipped engine, without recompiling game logic.
// Usage: node tools/build-hd-engine.cjs <directory containing wasm-dis and wasm-as> <scratch directory>
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const bin = process.argv[2];
const scratch = process.argv[3];
if (!bin || !scratch) throw Error('Pass Binaryen bin and scratch directories');
fs.mkdirSync(scratch, { recursive: true });
const original = path.join(root, 'engine/baye.wasm');
const originalBytes = fs.readFileSync(original);
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const wat = path.join(scratch, 'baye-original.wat');
const patchedWat = path.join(scratch, 'baye-hd.wat');
const extension = process.platform === 'win32' ? '.exe' : '';
cp.execFileSync(path.join(bin, 'wasm-dis' + extension), [original, '-o', wat]);
const source = fs.readFileSync(wat, 'utf8').replace(/\r\n/g, '\n');
let result = source;
// Each notification has an event id followed by eight i32 arguments.
const hooks = [
  ['SysSelectScreen', 1, 1], ['SysCopyScreen', 2, 1],
  ['SysSaveScreen', 3, 0], ['SysRestoreScreen', 4, 0],
  ['SysLcdPartClear', 5, 4], ['SysLcdReverse', 6, 4],
  ['SysRect', 7, 4], ['SysPutPixel', 8, 3],
  ['SysPictureEx', 9, 8], ['GamChinese', 10, 3], ['GamAscii', 11, 3],
  ['SysAdjustLCDBuffer', 12, 2], ['__memset', 13, 3], ['GamMovie', 14, 1]
];
const asyncState = source.match(/\n \(func \$asyncify_get_state \(result i32\)\n  \(global.get (\$[^)]+)\)/)?.[1];
assert.ok(asyncState, 'Asyncify state must be known to avoid notifications during stack replay');
const additions = [];
for (const [name, kind, count] of hooks) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\n \\(func \\$${escaped}(?= |\\n)[^\\n]*\\n(?:  \\(local [^\\n]*\\n)*`);
  assert.ok(pattern.test(result), `Missing drawing function ${name}`);
  const args = Array.from({ length: 8 }, (_, i) => i < count ? `(local.get $${i})` : '(i32.const 0)').join(' ');
  const ready = `(i32.eqz (global.get ${asyncState}))`;
  const condition = kind === 13 ? `(i32.and ${ready} (i32.ge_u (local.get $2) (i32.const 15360)))` : ready;
  const code = `  (if ${condition} (then (call $baye_hd_event (i32.const ${kind}) ${args})))\n`;
  additions.push(code);
  result = result.replace(pattern, match => match + code);
}
const importLine = ' (import "env" "baye_hd_event" (func $baye_hd_event (param i32 i32 i32 i32 i32 i32 i32 i32 i32)))\n';
result = result.replace(/\n (\(import )/, '\n' + importLine + ' $1');
// Strong invariant: removing exactly our notifications recovers all original WAT,
// including every instruction, data segment, table entry and global initializer.
let recovered = result.replace(importLine, '');
for (const code of additions) recovered = recovered.replace(code, '');
assert.equal(recovered, source);
fs.writeFileSync(patchedWat, result);
const output = path.join(root, 'engine/baye-hd.wasm');
cp.execFileSync(path.join(bin, 'wasm-as' + extension), [patchedWat, '-o', output, '-g']);
const oldModule = new WebAssembly.Module(originalBytes);
const newModule = new WebAssembly.Module(fs.readFileSync(output));
assert.deepEqual(WebAssembly.Module.exports(newModule), WebAssembly.Module.exports(oldModule));
assert.deepEqual(WebAssembly.Module.imports(newModule).filter(i => i.name !== 'baye_hd_event'), WebAssembly.Module.imports(oldModule));
assert.equal(digest(fs.readFileSync(original)), digest(originalBytes));
const manifest = { originalSHA256: digest(originalBytes), enhancedSHA256: digest(fs.readFileSync(output)), hooks, verification: 'Removing only the added import and notifications recovers the entire original WAT verbatim.' };
fs.writeFileSync(path.join(root, 'engine/hd-build.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
