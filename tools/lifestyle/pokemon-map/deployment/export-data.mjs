import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const deployment = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(deployment, '..');
const output = path.resolve(process.argv[2] ?? path.join(app, 'data'));
const modulePath = path.join(app, '.sites-runtime/published-data.mjs');
await mkdir(path.dirname(modulePath), { recursive: true });
await build({ entryPoints: [path.join(deployment, 'published-data.ts')], bundle: true, platform: 'node', format: 'esm', outfile: modulePath, nodePaths: [path.join(deployment, 'node_modules')] });
const { collectPublishedData } = await import(pathToFileURL(modulePath).href);
const data = await collectPublishedData();
await mkdir(output, { recursive: true });
for (const [route, value] of Object.entries(data)) {
  const json = JSON.stringify(value);
  await writeFile(path.join(output, `${route}.json`), json);
  const compressed = gzipSync(json);
  await writeFile(path.join(output, `${route}.json.gz`), compressed);
  console.log(`${route}: ${(compressed.length / 1024).toFixed(0)} KiB gzip`);
}
for (const [source, result] of Object.entries(data.snapshot.results)) {
  console.log(`${source}: ${result.status}, ${result.records.length} records`);
}
console.log(`Published snapshot captured at ${new Date(data.snapshot.delivery.generatedAt).toISOString()}`);
