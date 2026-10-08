import fs from "node:fs/promises";
const jobs = [
  ["map-guide.html", "https://bj.bendibao.com/tour/202356/347104.shtm"],
  [
    "city-zoo.pdf",
    "https://whlyj.beijing.gov.cn/ggfw/wh/201912/P020191209383499325005.pdf",
  ],
  [
    "osm-boundary.json",
    "https://www.openstreetmap.org/api/0.6/way/29222967/full.json",
  ],
  [
    "osm-map.osm",
    "https://www.openstreetmap.org/api/0.6/map?bbox=116.315,39.935,116.35,39.958",
  ],
  ["zoo-official.html", "http://www.beijingzoo.com/"],
  [
    "lioness-page.html",
    "https://sketchfab.com/3d-models/lioness-realistic-3d-model-demo-free-51e60bf5fe37445e91093b4b00a5b0aa",
  ],
  [
    "osm-overpass.txt",
    "https://overpass.kumi.systems/api/interpreter?data=" +
      encodeURIComponent("[out:json][timeout:30];way(29222967);out geom;"),
  ],
];
await Promise.all(
  jobs.map(async ([name, url]) => {
    try {
      let r = await fetch(url, {
        headers: {
          "User-Agent":
            "PHDSX-BeijingZooResearch/1.0 (https://github.com/phdsx/phdsx.github.io)",
        },
        signal: AbortSignal.timeout(50000),
      });
      console.log(name, r.status);
      const b = Buffer.from(await r.arrayBuffer());
      await fs.writeFile("research/" + name, b);
      console.log(
        name,
        b.length,
        name.includes("osm") ? b.toString().slice(0, 500) : "",
      );
    } catch (e) {
      console.log(name, e.message);
    }
  }),
);
