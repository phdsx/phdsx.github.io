import fs from "node:fs";
const s = fs.readFileSync("research/map-guide.html", "utf8");
console.log(
  "guide images",
  [...s.matchAll(/<img[^>]+src=["']([^"']+)/g)]
    .map((m) => m[1])
    .filter((x) => !x.includes("gif")),
);
const boundary = JSON.parse(fs.readFileSync("research/osm-boundary.json"));
console.log(
  "boundary",
  boundary.elements.find((e) => e.type === "way"),
);
const xml = fs.readFileSync("research/osm-map.osm", "utf8");
const attrs = (s) =>
  Object.fromEntries(
    [...s.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [
      m[1],
      m[2].replaceAll("&amp;", "&"),
    ]),
  );
const nodes = new Map();
const ways = [];
for (const m of xml.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
  const a = attrs(m[1]);
  a.tags = Object.fromEntries(
    [...String(m[2]).matchAll(/<tag\b([^>]*)/g)].map((t) => {
      const a = attrs(t[1]);
      return [a.k, a.v];
    }),
  );
  nodes.set(a.id, { ...a, lon: +a.lon, lat: +a.lat });
}
for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
  const a = attrs(m[1]),
    tags = Object.fromEntries(
      [...m[2].matchAll(/<tag\b([^>]*)/g)].map((t) => {
        const a = attrs(t[1]);
        return [a.k, a.v];
      }),
    );
  const refs = [...m[2].matchAll(/<nd ref="(\d+)"/g)].map((n) => n[1]);
  ways.push({ ...a, tags, refs });
}
fs.writeFileSync(
  "research/parsed-map.json",
  JSON.stringify({ nodes: [...nodes.values()], ways }),
);
console.log(
  "named",
  [...nodes.values(), ...ways]
    .filter(
      (e) =>
        e.tags.name &&
        ((e.lon > 116.32 &&
          e.lon < 116.342 &&
          e.lat > 39.938 &&
          e.lat < 39.95) ||
          e.refs?.some((r) => {
            const n = nodes.get(r);
            return (
              n &&
              n.lon > 116.32 &&
              n.lon < 116.342 &&
              n.lat > 39.938 &&
              n.lat < 39.95
            );
          })),
    )
    .map((e) => ({
      id: e.id,
      name: e.tags.name,
      lat: e.lat,
      lon: e.lon,
      tags: e.tags,
    }))
    .filter((e) => !/公路|公交|银行|公司|地铁|科技|宾馆/.test(e.name)),
);
