import fs from "node:fs";
import assert from "node:assert/strict";
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const d = read("public/data/layout.json"),
  dem = read("public/data/dem.json"),
  sources = read("public/data/sources.json");
assert.equal(d.metadata.unit, "m");
assert.deepEqual(d.metadata.originWGS84, [116.273, 39.99]);
assert.equal(dem.heights.length, dem.nx * dem.nz);
assert(dem.heights.every(Number.isFinite));
assert(d.buildings.length >= 220);
assert(d.paths.length >= 240);
assert(d.water.length >= 9);
assert(d.boundary.length > 100);
for (const name of [
  "佛香阁",
  "排云殿",
  "仁寿殿",
  "乐寿堂",
  "玉澜堂",
  "涵虚堂",
  "北宫门",
])
  assert(
    d.buildings.some((b) => b.name === name),
    name,
  );
assert(d.paths.some((p) => p.name === "十七孔桥" && p.bridge));
assert(sources.sources.length >= 20);
for (const alias of ["bark", "paving", "forest", "rock"])
  for (const type of ["color", "normalgl", "roughness"])
    assert(fs.statSync(`public/textures/${alias}-${type}.webp`).size > 1000);
assert(fs.existsSync("index.html"));
assert(fs.existsSync("README.md"));
assert(fs.existsSync("docs/ACCURACY.md"));
assert(fs.existsSync("docs/SOURCES.md"));
console.log(
  `PASS: metric data, ${d.buildings.length} buildings, ${d.paths.length} paths, ${d.water.length} waters, DEM ${dem.nx}×${dem.nz}, local PBR maps and documentation`,
);
