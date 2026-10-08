import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("research/parsed-map.json")),
  b = JSON.parse(fs.readFileSync("research/osm-boundary.json"));
const ns = new Map(m.nodes.map((n) => [n.id, n])),
  w = b.elements.find((e) => e.type === "way"),
  bn = new Map(
    b.elements.filter((e) => e.type === "node").map((n) => [n.id, n]),
  );
const poly = w.nodes.map((id) => [bn.get(id).lon, bn.get(id).lat]);
function inside(p) {
  let on = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      on = !on;
  }
  return on;
}
const center = (w) => {
  let ps = w.refs.map((id) => ns.get(id)).filter(Boolean);
  return [
    ps.reduce((s, n) => s + n.lon, 0) / ps.length,
    ps.reduce((s, n) => s + n.lat, 0) / ps.length,
  ];
};
console.log(
  "bounds",
  poly.reduce(
    (a, p) => [
      Math.min(a[0], p[0]),
      Math.min(a[1], p[1]),
      Math.max(a[2], p[0]),
      Math.max(a[3], p[1]),
    ],
    [180, 90, -180, -90],
  ),
);
console.log("nodes");
for (const n of m.nodes.filter(
  (n) =>
    inside([n.lon, n.lat]) &&
    (n.tags.name || n.tags.attraction || n.tags.amenity === "toilets"),
))
  console.log(
    JSON.stringify({
      id: n.id,
      lon: n.lon,
      lat: n.lat,
      date: n.timestamp,
      tags: n.tags,
    }),
  );
console.log("ways");
for (const w of m.ways.filter((w) => w.tags.name && inside(center(w))))
  console.log(
    JSON.stringify({
      id: w.id,
      center: center(w),
      date: w.timestamp,
      tags: w.tags,
    }),
  );
console.log(
  "counts",
  Object.entries({
    buildings: m.ways.filter((w) => w.tags.building && inside(center(w))),
    paths: m.ways.filter((w) => w.tags.highway && inside(center(w))),
    water: m.ways.filter(
      (w) => (w.tags.water || w.tags.natural === "water") && inside(center(w)),
    ),
    enclosures: m.ways.filter((w) => w.tags.barrier && inside(center(w))),
  }).map(([k, v]) => [k, v.length]),
);
