import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml' };
createServer((request, response) => {
  try {
    let path = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    if (statSync(path).isDirectory()) path = resolve(path, 'index.html');
    response.writeHead(200, { 'Content-Type':mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(readFileSync(path));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(8177, '127.0.0.1', () => console.log('Sand Sort: http://127.0.0.1:8177/games/puzzle/sand-sort/'));
