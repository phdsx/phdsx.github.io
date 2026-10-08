import * as T from "three";
import { inside } from "./geometry.js";
export function landmarks(models, bridgeModels, boat, corridor, ground) {
  const bridge = bridgeModels.find((b) => b.id === "bridge"),
    jade = bridgeModels
      .filter((b) => b.name === "玉带桥")
      .sort((a, b) => b.w - a.w)[0];
  const get = (id) => models.find((b) => b.id === id),
    landmarks = [
      get("foxiang"),
      get("paiyun"),
      {
        ...corridor.model,
        distance: 90,
        spawn: [corridor.point(390).x, corridor.point(390).z],
      },
      bridge,
      boat,
      get("renshou"),
      get("leshou"),
      get("yulan"),
      {
        id: "suzhou",
        name: "苏州街",
        x: -420,
        z: -1157,
        base: 1.2,
        h: 9,
        w: 180,
        d: 25,
        distance: 120,
        spawn: [-423, -1148],
      },
      {
        id: "xiequ",
        name: "谐趣园",
        x: 236,
        z: -1009,
        base: 3,
        h: 8,
        w: 100,
        d: 65,
        distance: 115,
        spawn: [223, -974],
      },
      { ...jade, id: "west-dyke", name: "西堤 · 玉带桥", distance: 95 },
      get("huazhong"),
      get("north"),
      { ...get("east"), spawn: [158, -736] },
      { ...get("new"), spawn: [61, 30] },
      get("hanxu"),
    ].filter(Boolean);
  const notes = {
    new: [
      "新建宫门一带位于昆明湖东堤外侧，是园区入口区域。",
      "定位依据 OSM 出口节点4116308192与官方导览关系，门区建筑为近似。原同名厕所和公交站坐标已排除，未据此当作宫门。",
      "https://www.summerpalace.net.cn/single/detail_g7yU_73/607.html",
    ],
    east: [
      "东宫门坐西朝东，是颐和园的正门。",
      "采用 OSM 建筑1559213224轮廓，按官方导览识别宫门；尺寸、门扇与檐口高度推算。",
      "https://gygl.beijing.gov.cn/whgy/whgy_wsgc/201912/t20191206_885616.html",
    ],
    foxiang: [
      "八面三层四重檐，位于万寿山前山中轴，是全园山水构图的重要中心。",
      "建筑通高采用新官网 36.44 m；台基名义高 20 m。平面来自 OSM，檐口、斗栱及立面比例按照片推算。",
      "https://summerpalace.net.cn/longevity/detailqianshan/382.html",
    ],
    paiyun: [
      "排云殿位于前山中轴，沿排云门、二宫门、德晖殿通向佛香阁。",
      "建筑位置、朝向和周边群落取自 OSM；外观、台基与屋顶高度推算。",
      "https://summerpalace.net.cn/longevity.html",
    ],
    corridor: [
      "长廊依山临水，将万寿山前的建筑连成一气，中间建有四座八角重檐亭。",
      "官方长度 728 m、273 间；中心线取 OSM 对应主体，局部转折和四亭位置近似。彩画为自绘示意纹样。",
      "https://summerpalace.net.cn/gallery_detail/369.html",
    ],
    bridge: [
      "十七孔桥东接东堤、西连南湖岛，以十七个桥券洞得名。",
      "17 个真实贯通桥孔；桥长采用 150 m，宽 8 m。孔径、拱高和栏杆尺寸推算，石狮采用轮廓简化。",
      "https://gygl.beijing.gov.cn/mlgy/mlgy_gyjg01/201912/t20191211_1048145.html",
    ],
    boat: [
      "石舫又名清晏舫，位于昆明湖西北部，石造船身上为仿西洋舱楼。",
      "官方船长 36 m；公开坐标经 OSM 石舫岸线轮廓校正约9m；定位仍为近似。舱楼、拱窗、明轮为照片推算。",
      "https://gygl.beijing.gov.cn/whgy/whgy_wsgc/201912/t20191206_885544.html",
    ],
    suzhou: [
      "苏州街位于后湖水系，体现江南水街的空间意象。",
      "后湖岸线、长桥与建筑群采用 OSM；商铺立面、门窗及水岸铺地简化。",
      "https://summerpalace.net.cn/longevity/detailhouhu/373.html",
    ],
    xiequ: [
      "谐趣园位于园区东北部，是以水池、游廊和厅堂组织空间的园中园。",
      "池塘、建筑和花园范围采用 OSM；廊、石景和绿化为合理近似。",
      "https://summerpalace.net.cn/longevity/detailhouhu/372.html",
    ],
  };
  for (const b of landmarks) {
    const n = notes[b.id];
    b.description =
      n?.[0] || "位置与朝向依据公开地图，属于颐和园山水和宫苑建筑体系。";
    b.accuracy =
      n?.[1] ||
      "平面：公开地图估计。高程：DEM 整合。立面细部与景观设施：照片推算和程序化简化。";
    b.source = n?.[2] || "https://summerpalace.net.cn/";
  }
  return landmarks;
}
export function ui(nav, renderer, camera, data, sites, onQuality) {
  const $ = (id) => document.getElementById(id);
  let selected = null;
  const showInfo = (b) => {
    selected = b;
    $("info").hidden = false;
    $("info-name").textContent = b.name;
    $("info-text").textContent = b.description;
    $("info-accuracy").textContent = b.accuracy;
    $("info-source").href = b.source;
    document
      .querySelectorAll("[data-place]")
      .forEach((el) =>
        el.classList.toggle("selected", el.dataset.place === b.id),
      );
  };
  const list = $("place-list");
  list.replaceChildren();
  const section = document.createElement("small");
  section.textContent = "山水 · 宫苑 · 后湖";
  list.append(section);
  for (const b of sites) {
    const btn = document.createElement("button");
    btn.textContent = b.name;
    btn.dataset.place = b.id;
    btn.addEventListener("click", () => {
      nav.locate(b);
      showInfo(b);
    });
    list.append(btn);
  }
  const mode = (m) => {
    nav.setMode(m);
    $("walk").classList.toggle("active", m === "walk");
    $("orbit").classList.toggle("active", m === "orbit");
    $("crosshair").hidden = m !== "walk";
    $("hint").textContent =
      m === "walk"
        ? "WASD 步行 · 按住左键观察 · Esc 释放鼠标"
        : "左键旋转 · 滚轮缩放 · 右键平移";
  };
  $("walk").onclick = () => mode("walk");
  $("orbit").onclick = () => mode("orbit");
  $("home").onclick = () => {
    mode("orbit");
    nav.home();
    $("info").hidden = true;
    document
      .querySelectorAll("[data-place]")
      .forEach((el) => el.classList.remove("selected"));
  };
  $("tour").onclick = () => {
    mode("walk");
    nav.startTour();
  };
  $("close-info").onclick = () => ($("info").hidden = true);
  $("enter-walk").onclick = () => {
    mode("walk");
    nav.locate(selected);
    $("info").hidden = true;
  };
  $("quality").onchange = (e) => onQuality(e.target.value);
  for (const [btn, panel] of [
    ["fold-map", "map-panel"],
    ["fold-places", "places"],
  ])
    $(btn).onclick = () => {
      const folded = $(panel).classList.toggle("folded");
      $(btn).setAttribute("aria-expanded", !folded);
      $(btn).lastElementChild.textContent = folded ? "+" : "−";
    };
  $("research").onclick = () => $("sources").showModal();
  $("help").onclick = () => $("instructions").showModal();
  document
    .querySelectorAll(".dialog-close")
    .forEach((el) => (el.onclick = () => el.closest("dialog").close()));
  const canvas = $("map"),
    ctx = canvas.getContext("2d"),
    extent = { x0: -1750, x1: 390, z0: -1280, z1: 1170 },
    scale = Math.min(
      284 / (extent.x1 - extent.x0),
      284 / (extent.z1 - extent.z0),
    ),
    origin = [
      150 - ((extent.x0 + extent.x1) / 2) * scale,
      150 - ((extent.z0 + extent.z1) / 2) * scale,
    ],
    map = (x, z) => [origin[0] + x * scale, origin[1] + z * scale];
  const cached = document.createElement("canvas");
  cached.width = cached.height = 300;
  const c = cached.getContext("2d");
  c.fillStyle = "#274a3e";
  c.fillRect(0, 0, 300, 300);
  const path = (points, context = c) => {
    context.beginPath();
    points.forEach(([x, z], i) => {
      const p = map(x, z);
      i ? context.lineTo(...p) : context.moveTo(...p);
    });
    context.closePath();
  };
  path(data.boundary);
  c.fillStyle = "#688163";
  c.fill();
  for (const w of data.water) {
    path(w.points);
    for (const h of w.holes) {
      const ring = [...h].reverse();
      c.moveTo(...map(...ring[0]));
      for (const p of ring) c.lineTo(...map(...p));
      c.closePath();
    }
    c.fillStyle = "#376960";
    c.fill("evenodd");
  }
  c.strokeStyle = "#c7c6a0";
  c.lineWidth = 0.8;
  for (const p of data.paths) {
    c.beginPath();
    p.points.forEach((v, i) => {
      i ? c.lineTo(...map(...v)) : c.moveTo(...map(...v));
    });
    c.stroke();
  }
  for (const b of data.buildings) {
    path(b.points);
    c.fillStyle = "#c4af72";
    c.fill();
  }
  c.strokeStyle = "#d2d4b866";
  path(data.boundary);
  c.stroke();
  c.strokeStyle = "#d2c8a2";
  c.beginPath();
  c.moveTo(13, 285);
  c.lineTo(13 + 500 * scale, 285);
  c.stroke();
  c.fillStyle = "#d6dbc1";
  c.font = "9px sans-serif";
  c.fillText("500 m", 16, 279);
  c.font = "10px sans-serif";
  c.fillText("N ↑", 273, 20);
  canvas.onclick = (e) => {
    const r = canvas.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 300,
      z = ((e.clientY - r.top) / r.height) * 300;
    let b = null,
      d = 18;
    for (const site of sites) {
      const p = map(site.x, site.z),
        dist = Math.hypot(p[0] - x, p[1] - z);
      if (dist < d) {
        b = site;
        d = dist;
      }
    }
    if (b) {
      nav.locate(b);
      showInfo(b);
    }
  };
  function update() {
    ctx.drawImage(cached, 0, 0);
    ctx.fillStyle = "#e3d398";
    for (const b of sites) {
      const p = map(b.x, b.z);
      ctx.beginPath();
      ctx.arc(...p, b.id === selected?.id ? 3.8 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = map(camera.position.x, camera.position.z),
      dir = new T.Vector3();
    camera.getWorldDirection(dir);
    ctx.save();
    ctx.translate(...p);
    ctx.rotate(-Math.atan2(dir.x, dir.z));
    ctx.fillStyle = "#edf4e6";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 16);
    ctx.lineTo(7, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(...p, 2.7, 0, Math.PI * 2);
    ctx.fill();
    if (nav.mode === "orbit") {
      const q = map(nav.orbit.target.x, nav.orbit.target.z);
      ctx.strokeStyle = "#ffffffaa";
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(...p);
      ctx.lineTo(...q);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeRect(q[0] - 3, q[1] - 3, 6, 6);
    } else {
      $("tour").classList.toggle("active", nav.auto);
    }
  }
  return { update, showInfo, mode, selected: () => selected };
}
