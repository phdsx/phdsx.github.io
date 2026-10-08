import { build } from 'esbuild';
import { cp, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const deployment = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(deployment, '..');
const root = path.resolve(app, '../../..');
const options = { bundle: true, minify: true, legalComments: 'eof', target: 'es2022', nodePaths: [path.join(deployment, 'node_modules')], alias: { '@': app }, jsx: 'automatic' };
await mkdir(path.join(app, 'assets'), { recursive: true });
for (const file of await readdir(path.join(app, 'assets'))) {
  if (/^(app\.(js|css)|chunk-[\w-]+\.js)$/.test(file)) await unlink(path.join(app, 'assets', file));
}
await build({ ...options, entryPoints: [path.join(deployment, 'client.tsx')], outdir: path.join(app, 'assets'), entryNames: 'app', chunkNames: 'chunk-[hash]', format: 'esm', splitting: true, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' } });
const dependencies = ['react', 'react-dom', 'lucide-react', 'maplibre-gl', 'polygon-clipping', '@turf/boolean-point-in-polygon'];
await mkdir(path.join(app, 'licenses'), { recursive: true });
for (const name of dependencies) {
  const source = path.join(deployment, 'node_modules', name);
  for (const file of await readdir(source)) {
    if (/^licen[sc]e(?:\..*)?$/i.test(file)) await cp(path.join(source, file), path.join(app, 'licenses', `${name.replaceAll('/', '-')}-${file}`));
  }
}
await writeFile(path.join(app, 'scene.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#087c85"><title>宝可梦视野地图</title><link rel="icon" href="public/favicon.svg"><link rel="stylesheet" href="assets/app.css"></head><body><div id="root"></div><script type="module" src="assets/app.js"></script><noscript>请启用 JavaScript 以使用宝可梦地图。</noscript></body></html>
`);
await mkdir(path.join(root, '.worker'), { recursive: true });
await build({ ...options, entryPoints: [path.join(root, 'worker/site.ts')], outfile: path.join(root, '.worker/site.mjs'), format: 'esm', platform: 'browser' });
await build({ ...options, entryPoints: [path.join(app, 'build/pogomap-local.ts')], outfile: path.join(root, '.worker/local-directory.mjs'), format: 'esm', platform: 'node' });
console.log('Built nested static Pokémon map and Cloudflare API worker.');
