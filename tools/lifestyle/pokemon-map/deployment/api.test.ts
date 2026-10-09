import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../../worker/site";
import { API_PREFIX } from "./api";
import { SNAPSHOT_GZIP, readSnapshotResponse } from "../lib/pokemon/json-response";
import { fetchApi, PUBLISHED_TRANSPORT } from "../lib/pokemon/deployment";
import { collectPublishedData, PUBLISHED_ROUTES } from "./published-data";
import { emptyResults } from "../lib/pokemon/snapshot";
import { gzipSync } from "node:zlib";

test("worker leaves other site routes with static assets and rejects invalid API requests", async () => {
  const calls: string[] = [];
  const env = { ASSETS: { async fetch(request: Request) { calls.push(request.url); return new Response("static"); } } };
  assert.equal(await (await worker.fetch(new Request("https://example.test/tours.html"), env)).text(), "static");
  assert.equal(await (await worker.fetch(new Request("https://example.test/api/snapshot"), env)).text(), "static");
  assert.equal(calls.length, 2);
  const unknown = await worker.fetch(new Request(`https://example.test${API_PREFIX}missing`), env);
  assert.equal(unknown.status, 404);
  const post = await worker.fetch(new Request(`https://example.test${API_PREFIX}snapshot`, { method: "POST" }), env);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET");
});

test("missing API checks published data and reports an unpublished snapshot without calling upstreams", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    return new Response("Not found", { status: 404 });
  };
  try {
    await assert.rejects(fetchApi("/api/snapshot"), /快照尚未发布/);
    assert.deepEqual(calls, ["/api/snapshot", "/data/snapshot.json.gz"]);
  } finally { globalThis.fetch = original; }
});

test("GitHub Pages reads nested gzip snapshots and ignores the API refresh query", async () => {
  const originalFetch = globalThis.fetch;
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { baseURI: "https://phdsx.github.io/tools/lifestyle/pokemon-map/scene.html" } });
  const payload = { source: "nyc", records: [{ rawId: "9007199254740993123", raw: { form: 48 } }] };
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    assert.equal(init?.credentials, "omit");
    return new Response(gzipSync(JSON.stringify(payload)), { headers: { "Content-Type": "application/octet-stream" } });
  };
  try {
    for (const route of PUBLISHED_ROUTES) {
      const response = await fetchApi(`/api/${route}?refresh=1`);
      assert.equal(response.headers.get(PUBLISHED_TRANSPORT), "published");
      assert.deepEqual(await readSnapshotResponse(response), payload);
    }
    assert.deepEqual(calls, PUBLISHED_ROUTES.map(route => `https://phdsx.github.io/tools/lifestyle/pokemon-map/data/${route}.json.gz`));
    await assert.rejects(fetchApi("/api/unknown"), /接口不存在/);
  } finally {
    globalThis.fetch = originalFetch;
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("static fallback handles HTML rewrites and leaves actual API failures visible", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? new Response("<html>static rewrite</html>", { headers: { "Content-Type": "text/html" } })
    : new Response(gzipSync('{"records":[]}'));
  try {
    assert.deepEqual(await readSnapshotResponse(await fetchApi("/api/gym-directory")), { records: [] });
    assert.equal(calls, 2);
    globalThis.fetch = async () => new Response('{"message":"service unavailable"}', { status: 502, headers: { "Content-Type": "application/json" } });
    assert.equal((await fetchApi("/api/snapshot")).status, 502);
  } finally { globalThis.fetch = original; }
});

test("static feeds without gzip support use JSON and preserve old acquisition times", async () => {
  const originalFetch = globalThis.fetch;
  const decompression = Object.getOwnPropertyDescriptor(globalThis, "DecompressionStream");
  Object.defineProperty(globalThis, "DecompressionStream", { configurable: true, value: undefined });
  const capturedAt = Date.now() - 600000;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    return calls.length === 1 ? new Response("missing", { status: 404 }) : Response.json({ source: "nyc", records: [], fetchedAt: capturedAt });
  };
  try {
    const value = await readSnapshotResponse(await fetchApi("/api/gym-raids")) as { stale: boolean; fetchedAt: number };
    assert.deepEqual(calls, ["/api/gym-raids", "/data/gym-raids.json"]);
    assert.equal(value.stale, true);
    assert.equal(value.fetchedAt, capturedAt);
  } finally {
    globalThis.fetch = originalFetch;
    if (decompression) Object.defineProperty(globalThis, "DecompressionStream", decompression);
    else Reflect.deleteProperty(globalThis, "DecompressionStream");
  }
});

test("published exports keep actual capture times, source failures and raw IDs", async () => {
  const capturedAt = Date.now() - 10 * 60 * 1000;
  const results = emptyResults();
  results.nyc = { ...results.nyc, status: "success", fetchedAt: capturedAt, records: [] };
  results.pgc = { ...results.pgc, status: "authorization", message: "坐标锁定" };
  const data = await collectPublishedData(async request => {
    const route = new URL(request.url).pathname.split("/api/")[1];
    return Response.json(route === "snapshot" ? { results, completedAt: capturedAt, nextUpdateAt: capturedAt + 300000 } : {
      source: "pogomap", records: [{ rawId: "9007199254740993123", raw: { id: "9007199254740993123" } }], fetchedAt: capturedAt, message: "本次打开取得的目录",
    });
  });
  const snapshot = data.snapshot as { delivery: { generatedAt: number }; results: typeof results };
  assert.equal(snapshot.delivery.generatedAt, capturedAt);
  assert.equal(snapshot.results.nyc.fetchedAt, capturedAt);
  assert.equal(snapshot.results.nyc.stale, true);
  assert.equal(snapshot.results.pgc.status, "authorization");
  assert.equal(snapshot.results.pgc.records.length, 0);
  const directory = data["gym-directory"] as { records: { rawId: string; raw: { id: string } }[] };
  assert.equal(directory.records[0].raw.id, "9007199254740993123");
});

test("a failed collection does not publish an empty replacement for all Pokemon sources", async () => {
  await assert.rejects(collectPublishedData(async () => Response.json({ results: emptyResults() })), /停止发布/);
  await assert.rejects(collectPublishedData(async () => new Response("unavailable", { status: 502 })), /采集失败/);
});

test("nested snapshot endpoint returns decodable gzip and honest upstream failures without visitor credentials", async () => {
  const original = globalThis.fetch;
  const upstream: string[] = [];
  globalThis.fetch = async (input, init) => {
    upstream.push(String(input));
    assert.equal(new Headers(init?.headers).get("Cookie"), null);
    return new Response("temporarily unavailable", { status: 503 });
  };
  try {
    const response = await worker.fetch(new Request(`https://example.test${API_PREFIX}snapshot`, { headers: { Accept: SNAPSHOT_GZIP, Cookie: "visitor=private", Authorization: "Bearer private" } }), { ASSETS: { async fetch() { throw Error("API must not fall through"); } } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Content-Type"), SNAPSHOT_GZIP);
    const snapshot = await readSnapshotResponse(response) as { results: Record<string, { status: string; records: unknown[] }>; nextUpdateAt: number };
    assert.ok(Object.keys(snapshot.results).length >= 8);
    for (const result of Object.values(snapshot.results)) {
      assert.ok(["error", "uncovered"].includes(result.status));
      assert.equal(result.records.length, 0);
    }
    assert.ok(snapshot.nextUpdateAt > Date.now());
    assert.ok(upstream.length > 0);
    assert.ok(upstream.every(url => !url.includes("example.test")));
  } finally { globalThis.fetch = original; }
});
