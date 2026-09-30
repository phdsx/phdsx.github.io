import fs from "node:fs/promises";
const jobs = [
  [
    "lion-original.html",
    "https://sketchfab.com/3d-models/lion-61d687ca92dc4cafbd5e74e3be40d49d",
  ],
  [
    "lion-mountain.jpg",
    "https://english.beijing.gov.cn/specials/parktours/guidevisitors/beijingzoo/mustsee/202301/W020230112329562031725.jpg",
  ],
  [
    "panda-house.jpg",
    "https://english.beijing.gov.cn/specials/parktours/guidevisitors/beijingzoo/mustsee/202301/W020230112330055953709.jpg",
  ],
  [
    "panda-new.jpg",
    "https://www.beijing.gov.cn/fuwu/bmfw/sy/jrts/202607/W020260707555330964344.jpg",
  ],
];
await Promise.all(
  jobs.map(async ([n, u]) => {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw Error(r.status);
      const b = Buffer.from(await r.arrayBuffer());
      await fs.writeFile("research/" + n, b);
      console.log(n, b.length);
    } catch (e) {
      console.log(n, e.message);
    }
  }),
);
