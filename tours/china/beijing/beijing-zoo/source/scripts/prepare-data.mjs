import fs from "node:fs/promises";
import { local, inside, centroid, bounds, geographic } from "../src/geo.js";
await fs.mkdir("public/data", { recursive: true });
await fs.mkdir("public/textures", { recursive: true });
const map = JSON.parse(await fs.readFile("research/parsed-map.json")),
  raw = JSON.parse(await fs.readFile("research/osm-boundary.json"));
const nodes = new Map(map.nodes.map((n) => [n.id, n])),
  bn = new Map(
    raw.elements.filter((n) => n.type === "node").map((n) => [n.id, n]),
  );
const bw = raw.elements.find((e) => e.type === "way"),
  boundary = bw.nodes.map((id) => local(bn.get(id).lon, bn.get(id).lat));
const pts = (w) =>
  w.refs
    .map((id) => nodes.get(id))
    .filter(Boolean)
    .map((n) => local(n.lon, n.lat));
const within = (w) => pts(w).some((p) => inside(p, boundary));
const convert = (w) => ({
  id: "osm-" + w.id,
  name: w.tags.name || "",
  points: pts(w),
  tags: w.tags,
  source: "osm",
  date: w.timestamp,
});
const buildings = map.ways
  .filter((w) => w.tags.building && within(w))
  .map((w) => ({
    ...convert(w),
    height: +w.tags.height || (+w.tags["building:levels"] || 1) * 4.2,
    heightStatus: "估算（无逐栋测高）",
  }));
const paths = map.ways
  .filter(
    (w) =>
      ["footway", "path", "pedestrian", "steps"].includes(w.tags.highway) &&
      within(w) &&
      !["private", "no"].includes(w.tags.access),
  )
  .map((w) => ({
    ...convert(w),
    width: +w.tags.width || (w.tags.highway === "pedestrian" ? 8 : 5),
    widthStatus: w.tags.width ? "OSM标注" : "估算",
    bridge: w.tags.bridge === "yes",
  }));
const water = map.ways
  .filter(
    (w) =>
      (w.tags.natural === "water" || w.tags.water) &&
      within(w) &&
      w.refs[0] === w.refs.at(-1),
  )
  .map(convert);
// Assemble multipolygon water/forest outlines rather than assuming unnamed ways are land.
const xml = await fs.readFile("research/osm-map.osm", "utf8");
const attrs = (s) =>
  Object.fromEntries(
    [...s.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
const wayById = new Map(map.ways.map((w) => [w.id, w]));
const forests = map.ways
  .filter(
    (w) =>
      (w.tags.landuse === "forest" || w.tags.natural === "wood") && within(w),
  )
  .map(convert);
for (const m of xml.matchAll(/<relation\b([^>]*)>([\s\S]*?)<\/relation>/g)) {
  const tags = Object.fromEntries(
    [...m[2].matchAll(/<tag\b([^>]*)/g)].map((t) => {
      const a = attrs(t[1]);
      return [a.k, a.v];
    }),
  );
  if (tags.natural !== "water" && tags.landuse !== "forest") continue;
  const members = [...m[2].matchAll(/<member\b([^>]*)/g)]
    .map((t) => attrs(t[1]))
    .filter((a) => a.type === "way" && a.role === "outer")
    .map((a) => wayById.get(a.ref))
    .filter(Boolean);
  let chains = members.map((w) => [...w.refs]);
  while (chains.length) {
    let chain = chains.shift(),
      changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < chains.length; i++) {
        let c = chains[i];
        if (chain.at(-1) === c[0]) chain.push(...c.slice(1));
        else if (chain.at(-1) === c.at(-1)) chain.push(...c.reverse().slice(1));
        else if (chain[0] === c.at(-1)) chain.unshift(...c.slice(0, -1));
        else if (chain[0] === c[0]) chain.unshift(...c.reverse().slice(0, -1));
        else continue;
        chains.splice(i, 1);
        changed = true;
        break;
      }
    }
    const p = chain
      .map((id) => nodes.get(id))
      .filter(Boolean)
      .map((n) => local(n.lon, n.lat));
    if (p.length < 3 || !p.some((p) => inside(p, boundary))) continue;
    const feature = {
      id: "osm-relation-" + attrs(m[1]).id,
      name: tags.name || "长河 / 园内水面",
      points: p,
      tags,
      source: "osm",
      date: attrs(m[1]).timestamp,
    };
    (tags.natural === "water" ? water : forests).push(feature);
  }
}
const enclosures = map.ways
  .filter(
    (w) =>
      (w.tags.zoo === "enclosure" ||
        w.tags.zoo === "aviary" ||
        ["273416876", "1205163230", "1205163232", "689563626"].includes(
          w.id,
        )) &&
      within(w) &&
      w.refs[0] === w.refs.at(-1),
  )
  .map(convert);
const sources = [
  [
    "osm",
    "OpenStreetMap 园区地理数据",
    "https://www.openstreetmap.org/way/29222967",
    "2025-12-02",
    "园界、道路、建筑、水岸和历史物种标注；非测绘成果",
    "ODbL-1.0",
  ],
  [
    "guide",
    "北京市文化和旅游局《残障人士文化旅游资源手册》",
    "https://whlyj.beijing.gov.cn/ggfw/wh/201912/P020191209383499325005.pdf",
    "2019-12-09",
    "PDF第8页导览图、正门照片；核对东/西/北区和主要场馆；不作精确测量",
    "参考阅读，不再分发图像",
  ],
  [
    "intro",
    "北京市公园管理中心：北京动物园简介",
    "https://gygl.beijing.gov.cn/dwjj/dwjj_zsdw/201911/t20191129_728906.html",
    "2019-11-29",
    "主要馆舍名单；面积约90公顷与其他口径存在差异",
    "参考阅读",
  ],
  [
    "panda",
    "北京市政府：大熊猫新馆开放在即",
    "https://www.beijing.gov.cn/fuwu/bmfw/sy/jrts/202607/t20260707_4750586.html",
    "2026-07-07",
    "原雉鸡苑改为熊猫活动场；新旧馆串联；当前扩建轮廓缺少测绘",
    "参考阅读",
  ],
  [
    "panda-open",
    "北京市公园管理中心：大熊猫馆正式开放",
    "https://gygl.beijing.gov.cn/xxgk/xxgk_tzgg/202607/t20260715_4763706.html",
    "2026-07-15",
    "大熊猫馆2026-07-16开放资料；不推断今日个体状态",
    "参考阅读",
  ],
  [
    "lion",
    "北京市政府：Lion and Tiger Mountain",
    "https://english.beijing.gov.cn/specials/parktours/guidevisitors/beijingzoo/mustsee/202301/t20230112_2897189.html",
    "2023-01-12",
    "狮虎山山形外观和大型猫科展示记录",
    "参考阅读",
  ],
  [
    "giraffe",
    "北京市公园管理中心：长颈鹿宝宝成长记",
    "https://gygl.beijing.gov.cn/ylkj/ylkj_kjkp/202404/t20240401_3607803.html",
    "2024-04-01",
    "长颈鹿馆展出长颈鹿记录；未核实亚种",
    "参考阅读",
  ],
  [
    "venues",
    "北京旅游网：北京动物园场馆介绍",
    "https://www.visitbeijing.com.cn/article/47QqyRCVqui",
    "2021（索引日期，具体日待核实）",
    "两爬馆、猩猩馆、犀牛河马馆等历史展示；不作为当前在展确认",
    "参考阅读",
  ],
  [
    "rhino",
    "北京旅游网：北京动物园景点介绍",
    "https://www.visitbeijing.com.cn/article/4E7nSjeMHkJ",
    "2023（索引日期，具体日待核实）",
    "犀牛河马馆长河北岸，白犀牛、独角犀、河马展示记录",
    "参考阅读",
  ],
  [
    "sunbear",
    "北京旅游网：马来熊亮相熊山",
    "https://s.visitbeijing.com.cn/index.php/gallery/26977",
    "2026-05-14",
    "熊山马来熊近期报道；仍非今日在展确认",
    "参考阅读",
  ],
  [
    "route",
    "北京市政府：走进北京动物园",
    "https://www.beijing.gov.cn/renwen/sy/whkb/202212/t20221216_2879833.html",
    "2022-12-16",
    "明星路线物种记录；不据此细分象的种类",
    "参考阅读",
  ],
  [
    "lion-model",
    "kenchoo：Lion 原模型",
    "https://sketchfab.com/3d-models/lion-61d687ca92dc4cafbd5e74e3be40d49d",
    null,
    "狮虎山的1只演示狮子；GLB原文件未修改，运行时缩放、动画裁剪",
    "GLB元数据 CC-BY-NC-SA-4.0；当前原页面 CC-BY-NC-4.0，遵守两者较严格条件",
  ],
  [
    "lion-mirror",
    "code4fukui/vr-cats 模型镜像及署名",
    "https://github.com/code4fukui/vr-cats",
    null,
    "合法免费狮子GLB镜像，保留作者与元数据",
    "模型许可单独适用",
  ],
  [
    "materials",
    "ambientCG PBR 材质",
    "https://ambientcg.com/",
    null,
    "Bark007、PavingStones036、Ground037、Rock039；复用本站已署名768px纹理",
    "CC0-1.0",
  ],
].map(([id, title, url, published, usage, license]) => ({
  id,
  title,
  url,
  published,
  accessed: "2026-10-01",
  usage,
  license,
}));
const venues = map.ways
  .filter(
    (w) =>
      w.tags.name &&
      within(w) &&
      (w.tags.attraction === "animal" ||
        w.tags.tourism === "aquarium" ||
        w.tags.tourism === "theme_park" ||
        [
          "25375855",
          "25375869",
          "273416828",
          "478432511",
          "1205163225",
        ].includes(w.id)),
  )
  .filter((w) => !["857823827", "857823828", "857823829"].includes(w.id))
  .map((w) => ({
    id: "v-" + w.id,
    name:
      {
        河马与犀牛馆: "犀牛河马馆",
        爬行动物馆: "两栖爬行动物馆",
        大象馆: "象馆",
        熊: "熊山",
        北极熊: "白熊馆",
        老鹰馆: "鹰山",
        猿猴馆: "猩猩馆（地图猿猴馆）",
      }[w.tags.name] || w.tags.name,
    osmId: w.id,
    position: centroid(pts(w)),
    geometry: pts(w),
    sourceIds: ["osm", "guide"],
    geometryStatus: "OSM轮廓；高度、立面、围隔构件估算",
    currentStatus: "开放状态未核实",
    note:
      w.tags.tourism === "aquarium"
        ? "独立运营及票务设施；仅外观，室内和海洋物种未建模"
        : w.id === "25375816" || w.id === "25375817"
          ? "基础轮廓来自2023年OSM；2026扩建范围与门窗位置待测绘核实；室内未建模"
          : "室内未建模；门窗、屋顶、围场细节为参考性简化。",
  }));
const addVenue = (id, name, position, extra = {}) =>
  venues.push({
    id,
    name,
    position,
    sourceIds: ["osm", "guide"],
    geometryStatus: "地图点位，无独立测绘轮廓",
    currentStatus: "开放状态未核实",
    note: "细节待核实",
    ...extra,
  });
addVenue("south-gate", "南门 / 正门", local(116.332204, 39.937422), {
  sourceIds: ["guide", "osm"],
  geometryStatus: "入口附近位置推算，门楼及前场无独立测绘轮廓",
  note: "三拱门外观依据官方手册照片；位置、尺寸、前场及浮雕为估算和简化",
});
addVenue("northwest-gate", "西北门", local(116.3245131, 39.9418757));
addVenue("north-gate", "北门", local(116.33416, 39.94461), {
  geometryStatus: "导览图位置估算",
});
for (const n of map.nodes.filter(
  (n) =>
    n.tags.attraction === "animal" && inside(local(n.lon, n.lat), boundary),
))
  addVenue("v-node-" + n.id, n.tags.name + "展区", local(n.lon, n.lat), {
    osmId: n.id,
    sourceDate: n.timestamp,
    note: "2020年公开地图标注；场馆归属及当前在展需再次核实；围场轮廓未独立建模",
  });
const species = [];
const add = (
  name,
  venueIds,
  sourceIds,
  date,
  category = "mammal",
  status = "资料记载，当前在展待核实",
  note = "未取得今日在展公告",
  model = null,
) =>
  species.push({
    id: "s-" + species.length,
    name,
    scientificName: null,
    venueIds,
    category,
    sourceIds,
    sourceDate: date,
    verifiedStatus: status,
    currentConfirmed: false,
    note,
    model,
    modelStatus: model ? "已接入，演示数量1只" : "缺少合适或许可可核实的模型",
    demoCount: model ? 1 : 0,
  });
add(
  "大熊猫",
  ["v-25375816", "v-25375817"],
  ["panda", "panda-open"],
  "2026-07-15",
  "mammal",
  "近期官方资料记载",
  "扩建涉及原雉鸡苑；具体分馆和今日在展个体未确认",
);
add(
  "非洲狮",
  ["v-273416876"],
  ["lion"],
  "2023-01-12",
  "mammal",
  undefined,
  "狮虎山资料记载；演示位置不代表实际隔间或动物定位",
  "lion.glb",
);
add("东北虎", ["v-273416876"], ["lion"], "2023-01-12");
add(
  "孟加拉虎",
  ["v-273416876"],
  ["lion"],
  "2023-01-12",
  "mammal",
  undefined,
  "白虎为毛色型，不另造物种",
);
add(
  "长颈鹿",
  ["v-25375846"],
  ["giraffe"],
  "2024-04-01",
  "mammal",
  undefined,
  "亚种未确认；候选模型许可溯源不足，未采用",
);
add("白犀牛", ["v-25375838"], ["rhino"], "2023（具体日待核实）");
add(
  "独角犀",
  ["v-25375838"],
  ["rhino"],
  "2023（具体日待核实）",
  "mammal",
  undefined,
  "来源俗名，未核实科学名称",
);
add("河马", ["v-25375838"], ["rhino"], "2023（具体日待核实）");
add(
  "象（种未确定）",
  ["v-25375829"],
  ["route"],
  "2022-12-16",
  "mammal",
  undefined,
  "仅有象馆和路线记录；不推断亚洲象或非洲象",
);
add(
  "马来熊",
  ["v-1205163232"],
  ["sunbear"],
  "2026-05-14",
  "mammal",
  "近期资料记载",
);
add("北极熊", ["v-1205163230"], ["route"], "2022-12-16");
add("黑猩猩", ["v-478457830"], ["venues", "route"], "2022-12-16");
add(
  "大猩猩",
  ["v-478457830"],
  ["venues"],
  "2021（具体日待核实）",
  "mammal",
  "历史记录",
  "资料明确为曾饲养；不作为现有在展",
);
add(
  "金丝猴",
  ["v-25375849"],
  ["route"],
  "2022-12-16",
  "mammal",
  undefined,
  "来源未细分种类，科学名留空",
);
add(
  "扬子鳄",
  ["v-25375863"],
  ["venues"],
  "2021（具体日待核实）",
  "reptile",
  "历史场馆资料记载",
);
add(
  "网蟒",
  ["v-25375863"],
  ["venues"],
  "2021（具体日待核实）",
  "reptile",
  "历史场馆资料记载",
);
add(
  "火烈鸟（种未确定）",
  ["v-478432519"],
  ["osm"],
  "2023-09-05",
  "bird",
  "历史地图馆名记录，待核实",
  "仅有馆名，物种与当前在展未确认",
);
add(
  "企鹅（种未确定）",
  ["v-25375861"],
  ["osm"],
  "2024-12-30",
  "bird",
  "历史地图馆名记录，待核实",
  "地图仍称企鹅与蝙蝠区；不推断今日蝙蝠展出",
);
add(
  "鹦鹉（种未确定）",
  ["v-478432518"],
  ["osm"],
  "2024-12-30",
  "bird",
  "历史地图馆名记录，待核实",
  "仅记录类群，不冒充已核实物种",
);
for (const n of map.nodes.filter(
  (n) =>
    n.tags.attraction === "animal" && inside(local(n.lon, n.lat), boundary),
))
  add(
    n.tags.name,
    ["v-node-" + n.id],
    ["osm"],
    n.timestamp.split("T")[0],
    "mammal",
    "历史地图记录，待核实",
    "公开地图2020年点位；未核实当前馆属与物种学名，原species标签只保留在地图源文件",
  );
for (const v of venues) {
  v.geographicPosition=geographic(...v.position);
  v.sourceDate=v.sourceDate||map.ways.find(w=>w.id===v.osmId)?.timestamp||'导览图2019；位置估算';
  v.speciesIds = species
    .filter((s) => s.venueIds.includes(v.id))
    .map((s) => s.id);
}
for(const s of species)s.locations=s.venueIds.map(id=>{const v=venues.find(v=>v.id===id);return {venueId:id,venueName:v.name,worldPosition:v.position,geographicPosition:v.geographicPosition,locationStatus:v.geometryStatus};});
const services = map.nodes
  .filter(
    (n) =>
      n.tags.amenity === "toilets" && inside(local(n.lon, n.lat), boundary),
  )
  .map((n) => ({
    id: "osm-" + n.id,
    name: "卫生间（地图记录）",
    position: local(n.lon, n.lat),
    source: "osm",
    date: n.timestamp,
    currentStatus: "设施现状待核实",
  }));
const out = {
  meta: {
    units: "metres",
    unitScale: 1,
    crs: "WGS84 EPSG:4326 → local tangent plane",
    origin: [116.332, 39.938],
    axes: "X东 / Y上 / -Z北",
    verticalDatum: "相对地面Y=0；无实测高程",
    accessed: "2026-10-01",
    boundaryVersion: 18,
    boundaryDate: bw.timestamp,
    extent: bounds(boundary),
    boundaryStatus: "公开地图边界，非管理权属界线；园内海洋馆单独标注",
    areaConflict: "OSM多边形面积约73.53公顷，2019官方简介约90公顷；统计口径、管理范围及图形缺漏未厘清，保留原始边界，不缩放凑面积",
  },
  boundary,
  buildings,
  paths,
  water,
  forests,
  enclosures,
  services,
};
const [gateX,gateZ]=venues.find(v=>v.id==='south-gate').position;
const rect=(x1,z1,x2,z2)=>[[x1,z1],[x2,z1],[x2,z2],[x1,z2],[x1,z1]];
out.plazas=[{id:'south-approach-estimate',name:'南门前场（照片推算）',points:rect(gateX-17,gateZ-8,gateX+17,gateZ+10),source:'guide',status:'估算，非实测'}];
out.barriers=[[-10,-8.2],[-4.6,-2.4],[2.4,4.6],[8.2,10]].map(([a,b],i)=>({id:'gate-pier-'+i,points:rect(gateX+a,gateZ-.55,gateX+b,gateZ+.55),source:'guide',status:'门柱碰撞，尺寸估算'}));
for (const [name, data] of Object.entries({
  "map.json": out,
  "venues.json": venues,
  "species.json": species,
  "sources.json": sources,
}))
  await fs.writeFile("public/data/" + name, JSON.stringify(data, null, 2));
// Publish a minimal source geographic dataset, retaining coordinates and OSM IDs for reproducibility.
const sourceWays = map.ways.filter(within),
  sourceRefs = new Set(sourceWays.flatMap((w) => w.refs));
await fs.writeFile(
  "public/data/osm-derived-geography.json",
  JSON.stringify({
    license: "ODbL-1.0",
    attribution: "© OpenStreetMap contributors",
    origin: out.meta.origin,
    boundary: raw,
    ways: sourceWays,
    nodes: map.nodes.filter(
      (n) => sourceRefs.has(n.id) || inside(local(n.lon, n.lat), boundary),
    ),
  }),
);
for (const name of ["bark", "paving", "forest", "rock"])
  for (const kind of ["color", "normalgl", "roughness"])
    await fs.copyFile(
      "../summer-palace/public/textures/" + name + "-" + kind + ".webp",
      "public/textures/" + name + "-" + kind + ".webp",
    );
console.log({
  buildings: buildings.length,
  paths: paths.length,
  water: water.length,
  enclosures: enclosures.length,
  venues: venues.length,
  species: species.length,
  extent: out.meta.extent,
});
