import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const root = new URL('../../../', base);
const read = name => readFile(new URL(name, base), 'utf8');

test('vendored engine and game resources match the recorded upstream bytes', async () => {
  const manifest = JSON.parse(await read('engine/manifest.json'));
  for (const item of manifest.files) {
    const bytes = await readFile(new URL('engine/' + item.file, base));
    assert.equal(bytes.length, item.bytes, item.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
  }
  const wasm = await readFile(new URL('engine/SpaceCadetPinball.wasm', base));
  assert.equal(WebAssembly.validate(wasm), true);
  assert.match(await read('engine/LICENSE'), /Copyright \(c\) 2020-2021 Andrey Muzychenko/);
});

test('all engine-packed resource offsets exist in the data package', async () => {
  const script = await read('engine/SpaceCadetPinball.js');
  const metadata = JSON.parse(script.match(/loadPackage\((\{"files":.+?\})\)/)[1]);
  const data = await readFile(new URL('engine/SpaceCadetPinball.data', base));
  assert.equal(metadata.remote_package_size, data.length);
  for (const file of metadata.files) {
    assert.ok(file.start >= 0 && file.end <= data.length && file.end > file.start, file.filename);
  }
  assert.ok(metadata.files.some(file => file.filename.endsWith('/PINBALL.DAT')));
});

test('game is in the directory, search index and arcade breadcrumb', async () => {
  const html = await readFile(new URL('games.html', root), 'utf8');
  const cards = [...html.matchAll(/class="games-directory-card" href="([^"]+)"/g)];
  assert.equal(cards.length, Number(html.match(/浏览 (\d+) 款/)[1]));
  assert.equal(cards.filter(match => match[1] === 'games/arcade/space-cadet-pinball/index.html').length, 1);
  assert.ok(html.includes(`${cards.length} 款小游戏`));
  const context = { window: {}, URLSearchParams };
  vm.runInNewContext(await readFile(new URL('assets/navigation.js', root), 'utf8'), context);
  const route = context.window.PHDSXNavigation.resolve('games/arcade/space-cadet-pinball/index.html');
  assert.equal(route.parent.href, 'games.html?category=arcade');
  assert.equal(route.crumbs.at(-1).zh, '三维弹球');
  assert.match(await readFile(new URL('assets/catalog.js', root), 'utf8'), /三维弹球.+space-cadet-pinball/);
  const cover = await readFile(new URL('cover.webp', base));
  assert.equal(cover.subarray(8, 12).toString(), 'WEBP');
});

test('game launch uses only local runtime scripts and resource addresses', async () => {
  for (const name of ['index.html', 'runtime.html']) {
    const html = await read(name);
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^https?:/.test(match[1])) { assert.equal(name, 'index.html'); continue; }
      await readFile(new URL(match[1].split('?')[0], new URL(name, base)));
    }
  }
  assert.match(await read('runtime.js'), /locateFile: file => 'engine\/' \+ file/);
  assert.match(await read('pinball.js'), /event\.source !== frame\.contentWindow/);
});
