import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../.worker/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiPrefix = '/tools/lifestyle/pokemon-map/api/';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.glb': 'model/gltf-binary' };

export async function assetResponse(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url).pathname); }
  catch { return new Response('Bad request', { status: 400 }); }
  const parts = pathname.split(/[\\/]/);
  if (parts.some(part => part.startsWith('.') || part === 'node_modules')) return new Response('Not found', { status: 404 });
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  try {
    let info = await stat(file);
    if (info.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file); }
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    const headers = { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': String(info.size), 'Cache-Control': 'no-cache' };
    return new Response(request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(file)), { headers });
  } catch { return new Response('Not found', { status: 404 }); }
}

const directoryCache = new Map();
async function localDirectory(kind) {
  const old = directoryCache.get(kind);
  if (old && old.until > Date.now()) return old.result;
  const { readPublicDirectory } = await import('../.worker/local-directory.mjs');
  const result = readPublicDirectory(path.join(root, 'tools/lifestyle/pokemon-map/scripts/read-pogomap.ps1'), kind);
  directoryCache.set(kind, { until: Date.now() + 60000, result });
  return result;
}

export async function siteResponse(request) {
  const pathname = new URL(request.url).pathname;
  if (process.platform === 'win32' && request.method === 'GET' && [apiPrefix + 'gym-directory', apiPrefix + 'stop-directory'].includes(pathname)) {
    const kind = pathname.endsWith('gym-directory') ? 'gym' : 'stop';
    return Response.json(await localDirectory(kind), { headers: { 'Cache-Control': 'no-store' } });
  }
  return worker.fetch(request, { ASSETS: { fetch: assetResponse } });
}

export function startServer(port = 8194) {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, `http://127.0.0.1:${port}`);
      const request = new Request(url, { method: incoming.method, headers: incoming.headers });
      const response = await siteResponse(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (!response.body || incoming.method === 'HEAD') outgoing.end();
      else {
        const body = Readable.fromWeb(response.body);
        body.on('error', () => outgoing.destroy());
        outgoing.on('close', () => body.destroy());
        body.pipe(outgoing);
      }
    } catch (error) {
      console.error(error.message);
      if (outgoing.headersSent) outgoing.destroy();
      else { outgoing.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }); outgoing.end(JSON.stringify({ message: '数据服务暂时不可用，请稍后重试' })); }
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Site and Pokémon API: http://127.0.0.1:${server.address().port}/tools/lifestyle/pokemon-map/index.html`));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer(Number(process.argv[2] ?? 8194));
