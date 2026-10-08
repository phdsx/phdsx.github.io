// Build the independent Vite projects into the public country/region tree.
import {cp, mkdir, readdir, readFile, unlink, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destinations = [
  ['tiantan', '天坛', 'Temple of Heaven'],
  ['forbidden-city', '故宫', 'Forbidden City'],
  ['summer-palace', '颐和园', 'Summer Palace'],
  ['beijing-zoo', '北京动物园', 'Beijing Zoo']
];
const selected = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
if (selected && !destinations.some(([slug]) => slug === selected)) throw new Error(`Unknown tour: ${selected}`);
for (const [slug, name, englishName] of destinations) {
  if (selected && slug !== selected) continue;
  const target = path.join(root, 'tours/china/beijing', slug);
  const source = path.join(target, 'source');
  const result = spawnSync(process.execPath, [path.join(source, 'node_modules/vite/bin/vite.js'), 'build'], {cwd:source, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  await mkdir(target, {recursive:true});
  await cp(path.join(source, 'dist'), target, {recursive:true});
  const currentAssets = new Set(await readdir(path.join(source, 'dist/assets')));
  for (const asset of await readdir(path.join(target, 'assets'))) {
    if (/\.(?:js|css)$/.test(asset) && !currentAssets.has(asset)) await unlink(path.join(target, 'assets', asset));
  }
  await cp(path.join(source, 'node_modules/three/LICENSE'), path.join(target, 'THREE-LICENSE.txt'));
  if (slug === 'tiantan') await cp(path.join(source, 'REFERENCES.md'), path.join(target, 'SOURCES.md'));
  if (slug === 'forbidden-city') await cp(path.join(source, 'docs/LICENSES.md'), path.join(target, 'SOURCES.md'));
  if (slug === 'summer-palace') await cp(path.join(source, 'docs/SOURCES.md'), path.join(target, 'SOURCES.md'));
  if (slug === 'beijing-zoo') {
    await cp(path.join(source, 'docs'), path.join(target, 'docs'), {recursive:true});
    await cp(path.join(source, 'docs/SOURCES.md'), path.join(target, 'SOURCES.md'));
    await cp(path.join(source, 'README.md'), path.join(target, 'README.md'));
  }
  // The scene runs at its own viewport size; the outer page provides site navigation.
  const scene = await readFile(path.join(target, 'index.html'), 'utf8');
  await writeFile(path.join(target, 'scene.html'), scene);
  const prefix = '../../../../';
  await writeFile(path.join(target, 'index.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#20372e"><title>${name} · 3D云游 - PHDSX</title><link rel="icon" type="image/svg+xml" href="${prefix}assets/tours/favicon.svg"><link rel="stylesheet" href="${prefix}assets/tours/scene.css?v=20261001tours"></head>
<body>
<nav class="tour-scene-nav" aria-label="当前位置"><ol>
<li><a href="${prefix}index.html">首页</a></li>
<li><a href="${prefix}tours.html">3D云游</a></li>
<li><a href="${prefix}tours.html?country=china">中国</a></li>
<li><a href="${prefix}tours.html?country=china&amp;region=beijing">北京</a></li>
<li><span aria-current="page">${name}</span></li>
</ol><div class="tour-scene-actions"><a href="${prefix}tours.html?country=china&amp;region=beijing" data-i18n="tours.return">返回北京景点</a><button type="button" data-i18n-toggle>EN</button></div></nav>
<iframe class="tour-frame" src="scene.html" title="${name} / ${englishName}" allow="fullscreen" allowfullscreen></iframe>
<script src="${prefix}assets/i18n.js?v=20261001tours"></script>
<noscript><p><a href="scene.html">${name} · 打开三维场景</a></p></noscript>
</body></html>
`);
  console.log(`Published locally: tours/china/beijing/${slug}/index.html`);
}
