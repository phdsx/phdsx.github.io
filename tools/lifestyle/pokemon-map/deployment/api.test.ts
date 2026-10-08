import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../../worker/site";
import { API_PREFIX } from "./api";
import { SNAPSHOT_GZIP, readSnapshotResponse } from "../lib/pokemon/json-response";
import { fetchApi } from "../lib/pokemon/deployment";

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

test("missing API stays a clear service error instead of attempting cross-origin source requests", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    return new Response("Not found", { status: 404 });
  };
  try {
    await assert.rejects(fetchApi("/api/snapshot"), /数据服务尚未连接/);
    assert.deepEqual(calls, ["/api/snapshot"]);
  } finally { globalThis.fetch = original; }
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
