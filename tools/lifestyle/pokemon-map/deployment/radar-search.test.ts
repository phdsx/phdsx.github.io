import test from "node:test";
import assert from "node:assert/strict";
import { apiResponse, API_PREFIX } from "./api";
import { DEFAULT_FILTERS, matches } from "../lib/pokemon/model";
import { RADAR_LIMIT, radarQuery, radarSearchUrl, inRadarRadius, parseRadarSnapshot, mergeRadarSnapshot, emptyRadarSnapshot } from "../lib/pokemon/radar-search";
import { radarApiUrl } from "../lib/pokemon/use-radar-search";
import { REFRESH_INTERVAL, SnapshotSchedule } from "../lib/pokemon/snapshot";

const query = radarQuery("40.758", "-73.9855", "2", ["spawns", "raids", "quests"]);
const now = Date.parse("2026-10-09T14:00:00Z");
const payload = () => ({
  spawns: [{ id: "1558102612379828246", lat: query.lat, lon: query.lng, pokemon_id: 25, percent_iv: 0, cp: 464, level: 19, expires_at: "2026-10-09T23:00:00+08:00" }],
  raids: [{ id: "1262471000719721918", lat: query.lat, lon: query.lng, gym_name: "Test gym", raid_level: 5, raid_pokemon_id: null, raid_battle_at: "2026-10-09T22:30:00+08:00", raid_end_at: "2026-10-09T23:15:00+08:00" }],
  quests: [{ id: "1555445831771895714", lat: query.lat, lon: query.lng, pokestop_name: "Test stop", quest_title: "quest_land_nice_plural", quest_rewards: [{ type: 2, info: { amount: 3 } }] }],
  generated_at: "2026-10-09T22:00:00+08:00",
});

test("coordinate search validates blank/invalid locations, radius and categories before any request", () => {
  for (const args of [["", "0", "2", ["spawns"]], ["91", "0", "2", ["spawns"]], ["0", "181", "2", ["spawns"]], ["0", "0", "16", ["spawns"]], ["0", "0", "0", ["spawns"]], ["0", "0", "2", []], ["0", "0", "2", ["invalid"]]] as const) {
    assert.throws(() => radarQuery(args[0], args[1], args[2], args[3]));
  }
  assert.deepEqual(radarQuery("0", "0", "15", ["quests", "spawns", "quests"]), { lat: 0, lng: 0, radiusKm: 15, layers: ["spawns", "quests"] });
});

test("nearby protocol uses the submitted center, radius and requested categories only", () => {
  const selected = radarQuery("-33.87", "151.2", "5", ["raids"]), url = radarSearchUrl(selected);
  assert.equal(url.origin, "https://pokecoords.iflowgo.com");
  assert.equal(url.pathname, "/iflowgopokecoords/api/v1/nearby");
  assert.deepEqual(Object.fromEntries(url.searchParams), { lat: "-33.87", lon: "151.2", radius_km: "5", layers: "raids", limit: String(RADAR_LIMIT) });
});

test("all three categories preserve raw IDs, unknown raid bosses and response provenance", () => {
  const snapshot = parseRadarSnapshot(payload(), query, now);
  assert.equal(snapshot.result.records[0].rawId, "1558102612379828246");
  assert.equal(snapshot.result.records[0].source, "radar");
  assert.equal(snapshot.result.records[0].iv, 0);
  assert.equal(snapshot.gyms.records[0].raid.dex, null);
  assert.equal(snapshot.gyms.records[0].team, null);
  assert.equal(snapshot.quests.records[0].description, "quest_land_nice_plural");
  assert.equal(snapshot.quests.records[0].expiresAt, null);
  assert.equal(snapshot.generatedAt, now);
  assert.equal(snapshot.result.updatedAt, null);
  assert.equal(snapshot.result.fetchedAt, now);
  assert.equal(snapshot.result.status, "partial");
  assert.equal(matches(snapshot.result.records[0], { ...DEFAULT_FILTERS, ivMin: "50" }, now), false);
  assert.equal(matches(snapshot.result.records[0], { ...DEFAULT_FILTERS, query: "25", cpMin: "400" }, now), true);
});

test("radius and expiry checks apply equally to Pokemon, raids and quests", () => {
  const data = payload();
  data.spawns.push({ ...data.spawns[0], id: "expired", expires_at: "2026-10-09T21:00:00+08:00" }, { ...data.spawns[0], id: "outside", lat: 41 });
  data.raids.push({ ...data.raids[0], id: "expired", raid_end_at: "2026-10-09T21:00:00+08:00" }, { ...data.raids[0], id: "outside", lat: 41 });
  data.quests.push({ ...data.quests[0], id: "outside", lat: 41 });
  const snapshot = parseRadarSnapshot(data, query, now);
  assert.deepEqual([snapshot.result.records.length, snapshot.gyms.records.length, snapshot.quests.records.length], [1, 1, 1]);
  assert.equal(snapshot.result.rejected, 3);
  assert.equal(inRadarRadius({ lat: 0, lng: -179.999 }, radarQuery("0", "179.999", "1", ["spawns"])), true);
});

test("unselected categories need no arrays; malformed selected data is rejected and caps remain explicit", () => {
  const raidsOnly = radarQuery("40.758", "-73.9855", "2", ["raids"]);
  assert.equal(parseRadarSnapshot({ raids: [] }, raidsOnly, now).result.records.length, 0);
  assert.throws(() => parseRadarSnapshot({ spawns: [] }, raidsOnly, now), /缺少团体战数组/);
  assert.throws(() => parseRadarSnapshot({ raids: [{ id: "bad", lat: null, lon: 0 }] }, raidsOnly, now), /全部未通过/);
  const data = payload();
  data.spawns = Array.from({ length: RADAR_LIMIT }, () => data.spawns[0]);
  const snapshot = parseRadarSnapshot(data, query, now);
  assert.equal(snapshot.result.records.length, 1);
  assert.match(snapshot.result.message, /800 条上限/);
});

test("temporary failures preserve only the same submitted search; authorization clears results", () => {
  const good = parseRadarSnapshot(payload(), query, now), bad = emptyRadarSnapshot(query);
  bad.result.status = bad.gyms.status = bad.quests.status = "error";
  const stale = mergeRadarSnapshot(good, bad);
  assert.equal(stale.result.fetchedAt, now);
  assert.equal(stale.result.stale, true);
  assert.equal(stale.gyms.records.length, 1);
  assert.equal(stale.quests.records.length, 1);
  const other = { ...bad, query: { ...query, radiusKm: 5 } };
  assert.equal(mergeRadarSnapshot(good, other).result.records.length, 0);
  bad.result.status = "authorization";
  assert.equal(mergeRadarSnapshot(good, bad).result.records.length, 0);
  const schedule = new SnapshotSchedule();
  assert.equal(schedule.due(now + REFRESH_INTERVAL), false);
  schedule.begin(); schedule.complete(now);
  assert.equal(schedule.due(now + REFRESH_INTERVAL - 1), false);
  assert.equal(schedule.due(now + REFRESH_INTERVAL), true);
});

test("coordinate API rejects missing parameters without fetching and sends no visitor credentials", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Cookie"), null);
    assert.equal(headers.get("Authorization"), null);
    assert.equal(headers.get("Referer"), "https://pokecoords.iflowgo.com/");
    return Response.json({ spawns: [], raids: [], quests: [] });
  };
  try {
    const prefix = `https://example.test${API_PREFIX}radar-search`;
    assert.equal((await apiResponse(new Request(prefix))).status, 400);
    assert.equal((await apiResponse(new Request(`${prefix}?lat=91&lon=0&radius_km=2&layers=spawns`))).status, 400);
    assert.equal(calls.length, 0);
    const url = `${prefix}?lat=0.25&lon=0.5&radius_km=3&layers=quests`;
    const response = await apiResponse(new Request(url, { headers: { Cookie: "private=1", Authorization: "Bearer private" } }));
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal((await response.json()).result.source, "radar");
    await apiResponse(new Request(url));
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0]).searchParams.get("layers"), "quests");
    assert.equal(new URL(calls[0]).searchParams.get("lat"), "0.25");
  } finally { globalThis.fetch = original; }
});

test("static hosting can address a configured live service without reading fixed snapshots", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    baseURI: "https://phdsx.github.io/tools/lifestyle/pokemon-map/scene.html",
    querySelector: () => ({ content: "https://map-api.example.test" }),
  } });
  try {
    const url = new URL(radarApiUrl(query));
    assert.equal(url.origin, "https://map-api.example.test");
    assert.equal(url.pathname, `${API_PREFIX}radar-search`);
    assert.equal(url.searchParams.get("lon"), "-73.9855");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
