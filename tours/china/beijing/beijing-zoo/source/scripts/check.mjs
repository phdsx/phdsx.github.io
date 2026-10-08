import fs from "node:fs";
import assert from "node:assert/strict";
import {
  local,
  geographic,
  inside,
  distance,
  centroid,
  segmentPoint,
} from "../src/geo.js";
import { createNavigation } from "../src/navigation.js";
const read = (n) => JSON.parse(fs.readFileSync("public/data/" + n + ".json"));
const map = read("map"),
  venues = read("venues"),
  species = read("species"),
  sources = read("sources");
assert.equal(map.meta.unitScale, 1);
assert.equal(map.meta.units, "metres");
for (const p of [
  [116.322, 39.938],
  [116.336, 39.944],
]) {
  const back = geographic(...local(...p));
  assert(distance(p, back) < 1e-10);
}
const sourceIds = new Set(sources.map((s) => s.id)),
  venueIds = new Set(venues.map((v) => v.id));
assert.equal(venueIds.size, venues.length);
const nav = createNavigation(map),
  spawns = venues.map((v) => ({ id: v.id, ...nav.spawn(v.position) }));
for (const v of venues) {
  assert(v.sourceDate);
  assert(v.geographicPosition.length === 2);
  for (const id of v.sourceIds) assert(sourceIds.has(id));
  const p = nav.spawn(v.position).position;
  assert(nav.ground(p) !== null, "spawn " + v.id);
  assert(inside(p, map.boundary));
}
for (const s of species) {
  assert(s.currentConfirmed === false);
  assert(s.sourceDate && s.verifiedStatus && s.note);
  for (const id of s.venueIds) assert(venueIds.has(id));
  for (const id of s.sourceIds) assert(sourceIds.has(id));
  assert.equal(s.locations.length, s.venueIds.length);
  for (const loc of s.locations)
    assert.deepEqual(
      loc.worldPosition,
      venues.find((v) => v.id === loc.venueId).position,
    );
  if (s.model) assert(fs.existsSync("public/models/" + s.model));
  else assert.equal(s.demoCount, 0);
}
// Exercise conservative navigation against buildings, enclosure edges, water and huge movement deltas.
let blockedTargets = 0;
for (const b of [...map.buildings, ...map.enclosures, ...map.barriers]) {
  const p = centroid(b.points);
  if (inside(p, b.points)) {
    assert.equal(nav.ground(p), null);
    blockedTargets++;
  }
  for (let i = 1; i < b.points.length; i += 3) {
    const a = b.points[i - 1],
      c = b.points[i],
      mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    assert.equal(nav.ground(mid), null);
    blockedTargets++;
  }
}
const moves = [];
for (const v of spawns.filter((_, i) => i % 3 === 0)) {
  for (const [dx, dz] of [
    [100, 0],
    [-100, 0],
    [0, 100],
    [0, -100],
    [100, 100],
  ]) {
    const p = nav.move(v.position, dx, dz);
    assert(nav.ground(p) !== null);
    assert(!map.enclosures.some((b) => inside(p, b.points)));
    moves.push({ venue: v.id, to: p });
  }
}
let walkableSegments = 0,
  blockedSegments = 0;
for (const s of nav.segments) {
  const p = segmentPoint(
    [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2],
    s.a,
    s.b,
  );
  if (nav.ground(p) !== null) walkableSegments++;
  else blockedSegments++;
}
const area = Math.abs(
  map.boundary.reduce((s, p, i) => {
    const q = map.boundary[(i + 1) % map.boundary.length];
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2,
);
const result = {
  date: "2026-10-01",
  units: "metres",
  boundaryAreaM2: area,
  counts: {
    buildings: map.buildings.length,
    paths: map.paths.length,
    water: map.water.length,
    venues: venues.length,
    species: species.length,
  },
  safeSpawns: spawns.length,
  blockedTargets,
  largeMovementTests: moves.length,
  walkableSegments,
  blockedSegments,
  notes: [
    "拒绝的道路中点可能落入旧地图建筑/围场或缺少桥梁标注处，保持保守阻挡；不能据此声称全园每条道路连通",
    "面积是OSM边界计算值，非管理部门官方面积",
  ],
};
fs.mkdirSync("evidence", { recursive: true });
fs.writeFileSync("evidence/data-check.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
