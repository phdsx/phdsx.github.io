import test from 'node:test';
import assert from 'node:assert/strict';
import { assetResponse, siteResponse } from './serve-site.mjs';

test('preview serves nested static resources with correct MIME and protects local tool directories', async () => {
  const base = 'http://127.0.0.1:8194';
  const html = await assetResponse(new Request(base + '/tools/lifestyle/pokemon-map/index.html'));
  assert.equal(html.status, 200);
  assert.match(html.headers.get('Content-Type'), /text\/html/);
  assert.match(await html.text(), /scene\.html/);
  const module = await assetResponse(new Request(base + '/tools/lifestyle/pokemon-map/public/maplibre-gl-worker.mjs', { method: 'HEAD' }));
  assert.equal(module.status, 200);
  assert.match(module.headers.get('Content-Type'), /text\/javascript/);
  assert.equal(module.body, null);
  for (const target of ['/.git/config', '/.worker/site.mjs', '/tools/lifestyle/pokemon-map/deployment/node_modules/react/package.json', '/%2e%2e%5cREADME.md']) {
    assert.equal((await assetResponse(new Request(base + target))).status, 404);
  }
});

test('preview directs API requests to the data service instead of missing static files', async () => {
  const response = await siteResponse(new Request('http://127.0.0.1:8194/tools/lifestyle/pokemon-map/api/snapshot', { method: 'POST' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
  const missing = await siteResponse(new Request('http://127.0.0.1:8194/tools/lifestyle/pokemon-map/api/missing'));
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).message, '接口不存在');
});
