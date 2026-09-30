import * as T from "three";
import {
  Batch,
  roofGeometry,
  polygon,
  instances,
  railing,
} from "./geometry.js";
import { batchCoarseBuildings } from "./building-batches.js";
import { boatCarving } from "./boat-details.js";
import { towerJoinery, lionGeometry } from "./heritage-details.js";
import { hipTiles, octTiles, gableHip } from "./roof-details.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { segment, pathStrip } from "./landscape.js";
export const official = "https://summerpalace.net.cn/";
const idMap = {
  佛香阁: "foxiang",
  排云殿: "paiyun",
  乐寿堂: "leshou",
  仁寿殿: "renshou",
  玉澜堂: "yulan",
  北宫门: "north",
  东宫门: "east",
  涵虚堂: "hanxu",
  大戏台: "stage",
  文昌阁: "wenchang",
  画中游: "huazhong",
};
const levels = {
  佛香阁: 36.44,
  排云殿: 14,
  大戏台: 21,
  智慧海: 13,
  香岩宗印之阁: 18,
  文昌阁: 13,
  乐寿堂: 9,
  仁寿殿: 11,
  涵虚堂: 12,
};
const yellow = new Set([
  "佛香阁",
  "排云殿",
  "二宫门",
  "排云门",
  "智慧海",
  "德晖殿",
  "香岩宗印之阁",
  "文昌阁",
  "北宫门",
  "景福阁",
  "涵虚堂",
]);
export function prepareBuildings(data, ground) {
  const models = [];
  for (const original of data.buildings) {
    const b =
      original.id === "1559213224" ? { ...original, name: "东宫门" } : original;
    if (b.w < 2 || b.d < 2) continue;
    let h = levels[b.name] || Math.min(11, 4.2 + Math.min(b.w, b.d) * 0.24);
    const base = ground.natural(b.x, b.z);
    const model = {
      ...b,
      id: idMap[b.name] || b.id,
      base,
      h,
      roofMat: yellow.has(b.name) ? "tile" : "darkTile",
      double: ["排云殿", "文昌阁", "大戏台", "香岩宗印之阁", "景福阁"].includes(
        b.name,
      ),
      bays: Math.max(3, Math.min(9, Math.round(b.w / 4) | 1)),
      gate: b.name.includes("门") || b.tags.building === "triumphal_arch",
      pavilion: b.name.includes("亭") || b.name === "宝云阁",
    };
    if (b.name === "佛香阁") {
      model.base = Math.max(48, base + 3);
      ground.platforms.push({
        x: b.x,
        z: b.z,
        w: 42,
        d: 43,
        y: model.base,
        yaw: 0,
        core: true,
      });
    } else if (b.w < 85 && b.d < 75 && !b.holes.length) {
      ground.platforms.push({
        x: b.x,
        z: b.z,
        w: b.w + 2.5,
        d: b.d + 2.5,
        y: base,
        yaw: b.yaw,
      });
    }
    models.push(model);
  }
  const x = 74.533,
    z = 36.802,
    base = ground.natural(x, z);
  models.push({
    id: "new",
    name: "新建宫门区",
    x,
    z,
    w: 18,
    d: 7,
    base,
    h: 7.8,
    yaw: 1.05,
    roofMat: "darkTile",
    double: false,
    bays: 5,
    gate: true,
    pavilion: false,
    holes: [],
    points: [],
    tags: {},
    confidence:
      "Approximate gate structure near mapped exit node4116308192; main-gate footprint unavailable",
  });
  ground.platforms.push({ x, z, w: 20, d: 9, y: base, yaw: 1.05 });
  return models;
}
function octRoof(radius, rise) {
  const pos = [],
    uv = [];
  for (let s = 0; s < 8; s++)
    for (let j = 0; j < 14; j++) {
      const a = (s * Math.PI) / 4 + Math.PI / 8,
        b = ((s + 1) * Math.PI) / 4 + Math.PI / 8,
        t = j / 14,
        u = (j + 1) / 14;
      const p = (angle, t) => [
        radius * t * Math.cos(angle),
        rise * (1 - t) ** 1.65 + 0.6 * t ** 6,
        radius * t * Math.sin(angle),
      ];
      const v = [p(a, t), p(b, t), p(b, u), p(a, u)];
      for (const k of [0, 2, 1, 0, 3, 2]) {
        pos.push(...v[k]);
        uv.push(v[k][0] / 0.45, v[k][2] / 0.45);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  const smooth = mergeVertices(g, 1e-4);
  g.dispose();
  smooth.computeVertexNormals();
  return smooth;
}
function localHall(b, m, detail = false) {
  const batch = new Batch(m),
    g = new T.Group(),
    w = b.w,
    d = b.d,
    h = b.h,
    base = b.base;
  g.position.set(b.x, 0, b.z);
  g.rotation.y = b.yaw;
  batch.box(w + 1.8, 0.65, d + 1.8, 0, base - 0.325, 0, "stone");
  const body = h * (b.double ? 0.42 : 0.62),
    cy = base + body;
  if (!b.pavilion) {
    if (b.gate) {
      batch.box(w * 0.22, body, d * 0.75, -w * 0.39, base + body / 2, 0, "red");
      batch.box(w * 0.22, body, d * 0.75, w * 0.39, base + body / 2, 0, "red");
      batch.box(
        w * 0.56,
        body * 0.23,
        d * 0.75,
        0,
        base + body * 0.885,
        0,
        "wood",
      );
    } else
      batch.box(
        w * 0.89,
        body * 0.94,
        d * 0.77,
        0,
        base + body * 0.47,
        0,
        b.name === "智慧海" ? "stone" : "red",
      );
  }
  batch.box(w, 0.33, d * 0.96, 0, cy - 0.13, 0, "paint");
  const customGable = detail && /殿|堂|阁|斋/.test(b.name);
  if (customGable && !b.double)
    gableHip(batch, w + 2.5, d + 2.7, h - body, cy, b.roofMat);
  else
    batch.add(
      roofGeometry(
        w + 2.5,
        d + 2.7,
        b.double ? h * 0.2 : h - body,
        "hip",
        detail ? 14 : 6,
      ),
      b.roofMat,
      0,
      cy,
      0,
    );
  if (b.double) {
    batch.box(w * 0.78, h * 0.22, d * 0.76, 0, cy + h * 0.11, 0, "red");
    if (customGable)
      gableHip(
        batch,
        w * 0.88 + 2,
        d * 0.83 + 2,
        h * 0.36,
        base + h * 0.64,
        b.roofMat,
      );
    else
      batch.add(
        roofGeometry(
          w * 0.88 + 2,
          d * 0.83 + 2,
          h * 0.36,
          "hip",
          detail ? 14 : 6,
        ),
        b.roofMat,
        0,
        base + h * 0.64,
        0,
      );
  }
  batch.box(
    Math.max(1, w - d * 0.65),
    0.38,
    0.45,
    0,
    base + h + 0.1,
    0,
    "ridge",
  );
  const cols = [];
  for (const side of [-1, 1])
    for (let i = 0; i <= b.bays; i++)
      cols.push({
        x: -w * 0.48 + (i * w * 0.96) / b.bays,
        y: base + body / 2,
        z: side * d * 0.46,
        sx: 0.45,
        sy: body,
        sz: 0.45,
      });
  g.add(
    instances(
      new T.CylinderGeometry(1, 1, 1, 10),
      b.name === "宝云阁" ? m.copper : m.red,
      cols,
    ),
  );
  for (const side of [-1, 1])
    batch.box(w, 0.34, 0.24, 0, cy - 0.6, side * d * 0.46, "paint");
  if (detail) {
    if (!customGable || b.double)
      hipTiles(
        batch,
        w + 2.5,
        d + 2.7,
        b.double ? h * 0.2 : h - body,
        cy,
        b.roofMat === "tile" ? "ridge" : "darkTile",
      );
    if (b.double && !customGable)
      hipTiles(
        batch,
        w * 0.88 + 2,
        d * 0.83 + 2,
        h * 0.36,
        base + h * 0.64,
        b.roofMat === "tile" ? "ridge" : "darkTile",
      );
    const screens = [],
      bars = [],
      brackets = [],
      rafters = [];
    for (const side of [-1, 1])
      for (let i = 0; i < b.bays; i++) {
        const xx = -w * 0.48 + ((i + 0.5) * w * 0.96) / b.bays,
          ww = (w * 0.82) / b.bays;
        if (!b.pavilion && !(b.gate && Math.abs(xx) < w * 0.22)) {
          screens.push({
            x: xx,
            y: base + body * 0.48,
            z: side * d * 0.393,
            sx: ww,
            sy: body * 0.76,
            sz: 0.13,
          });
          for (let j = 0; j < 6; j++)
            bars.push({
              x: xx - ww * 0.43 + j * ww * 0.172,
              y: base + body * 0.53,
              z: side * (d * 0.393 + 0.08),
              sx: 0.045,
              sy: body * 0.58,
              sz: 0.06,
            });
          for (let j = 0; j < 8; j++)
            bars.push({
              x: xx,
              y: base + body * 0.27 + j * body * 0.073,
              z: side * (d * 0.393 + 0.1),
              sx: ww,
              sy: 0.05,
              sz: 0.05,
            });
        }
      }
    for (const c of cols)
      for (let j = 0; j < 4; j++) {
        brackets.push({
          x: c.x,
          y: cy - 0.75 + j * 0.16,
          z: c.z + Math.sign(c.z) * j * 0.17,
          sx: 0.8 + j * 0.28,
          sy: 0.13,
          sz: 0.32,
        });
        brackets.push({
          x: c.x,
          y: cy - 0.83 + j * 0.16,
          z: c.z + Math.sign(c.z) * j * 0.17,
          sx: 0.2,
          sy: 0.13,
          sz: 0.7 + j * 0.22,
        });
      }
    for (const side of [-1, 1])
      for (let x = -w * 0.49; x < w * 0.5; x += 0.45)
        rafters.push({
          x,
          y: cy - 0.08,
          z: side * (d * 0.47 + 0.45),
          sx: 0.11,
          sy: 0.13,
          sz: 1.45,
        });
    g.add(
      instances(new T.BoxGeometry(1, 1, 1), m.window, screens),
      instances(new T.BoxGeometry(1, 1, 1), m.wood, bars),
      instances(new T.BoxGeometry(1, 1, 1), m.paint, brackets),
      instances(new T.BoxGeometry(1, 1, 1), m.red, rafters),
    );
    if (b.name)
      g.add(
        plaque(b.name, Math.min(5, w * 0.27), base + body * 0.78, d * 0.495, m),
      );
  }
  g.add(batch.finish());
  g.userData.model = b;
  return g;
}
function plaque(name, w, y, z, m) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1c3736";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#c0a860";
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = "#d9bb6b";
  ctx.font = "58px SimSun,serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 256, 67);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(
    new T.PlaneGeometry(w, w / 4),
    new T.MeshStandardMaterial({ map: tex, roughness: 0.82 }),
  );
  mesh.position.set(0, y, z);
  return mesh;
}
function tower(b, m, detail = true) {
  const g = new T.Group();
  g.position.set(b.x, 0, b.z);
  const batch = new Batch(m),
    y = b.base;
  batch.box(42, 20, 43, 0, y - 10, 0, "stone");
  batch.box(44, 0.65, 45, 0, y - 0.1, 0, "stone");
  batch.box(40, 0.12, 41, 0, y + 0.29, 0, "pave");
  const columns = [],
    brackets = [],
    lattice = [];
  for (let floor = 0; floor < 3; floor++) {
    const bottom = y + floor * 9.8,
      r = 9.7 - floor * 0.65,
      hh = 8.7;
    batch.add(
      new T.CylinderGeometry(r * 0.86, r * 0.86, hh, 8),
      "window",
      0,
      bottom + hh / 2,
      0,
      Math.PI / 8,
    );
    batch.add(
      new T.CylinderGeometry(r * 0.89, r * 0.89, 0.35, 8),
      "red",
      0,
      bottom + 0.2,
      0,
      Math.PI / 8,
    );
    for (let s = 0; s < 8; s++) {
      const a = (s * Math.PI) / 4 + Math.PI / 8;
      columns.push({
        x: Math.cos(a) * r,
        y: bottom + hh / 2,
        z: Math.sin(a) * r,
        sx: 0.5,
        sy: hh,
        sz: 0.5,
      });
      const mid = a + Math.PI / 8,
        len = 2 * r * Math.sin(Math.PI / 8),
        yaw = -mid - Math.PI / 2;
      batch.box(
        len,
        0.4,
        0.3,
        Math.cos(mid) * r * 0.924,
        bottom + hh - 0.65,
        Math.sin(mid) * r * 0.924,
        "paint",
        yaw,
      );
      batch.box(
        len,
        0.18,
        0.21,
        Math.cos(mid) * r * 0.92,
        bottom + 1.8,
        Math.sin(mid) * r * 0.92,
        "gold",
        yaw,
      );
      for (let k = 0; k < 4; k++)
        brackets.push({
          x: Math.cos(a) * (r + k * 0.22),
          y: bottom + hh - 0.8 + k * 0.17,
          z: Math.sin(a) * (r + k * 0.22),
          sx: 0.7 + k * 0.34,
          sy: 0.14,
          sz: 0.45,
        });
      for (let k = 0; k < 9; k++) {
        const offset = ((k - 4) * len) / 10;
        const x = Math.cos(mid) * r * 0.86 - Math.sin(mid) * offset,
          z = Math.sin(mid) * r * 0.86 + Math.cos(mid) * offset;
        lattice.push({
          x,
          y: bottom + hh * 0.49,
          z,
          sx: 0.045,
          sy: hh * 0.6,
          sz: 0.045,
        });
      }
    }
    const rr = r + 2.4;
    batch.add(octRoof(rr, 3.3), "tile", 0, bottom + hh, 0);
    if (detail) octTiles(batch, rr, 3.3, bottom + hh);
    for (let s = 0; s < 8; s++) {
      const a = (s * Math.PI) / 4 + Math.PI / 8,
        b = ((s + 1) * Math.PI) / 4 + Math.PI / 8,
        ax = Math.cos(a) * rr,
        az = Math.sin(a) * rr,
        bx = Math.cos(b) * rr,
        bz = Math.sin(b) * rr,
        len = Math.hypot(ax - bx, az - bz);
      batch.box(
        len,
        0.17,
        0.22,
        (ax + bx) / 2,
        bottom + hh + 0.57,
        (az + bz) / 2,
        "greenTile",
        -Math.atan2(bz - az, bx - ax),
      );
      for (let k = 1; k < 9; k++) {
        const t = k / 9,
          angle = T.MathUtils.lerp(a, b, t),
          x = Math.cos(angle) * rr * 0.57,
          z = Math.sin(angle) * rr * 0.57;
        batch.box(
          0.1,
          0.06,
          rr * 0.75,
          x,
          bottom + hh + 1.65,
          z,
          "ridge",
          -angle,
        );
      }
    }
  }
  batch.add(octRoof(9.2, 5.5), "tile", 0, y + 30.1, 0);
  if (detail) octTiles(batch, 9.2, 5.5, y + 30.1);
  batch.add(new T.SphereGeometry(0.48, 12, 8), "gold", 0, y + 35.96, 0);
  g.add(
    instances(new T.CylinderGeometry(1, 1, 1, 12), m.red, columns),
    instances(new T.BoxGeometry(1, 1, 1), m.paint, brackets),
    instances(new T.BoxGeometry(1, 1, 1), m.gold, lattice),
  );
  if (detail) towerJoinery(batch, b);
  g.add(railing(batch, 0, 0, 42, 43, y + 0.3, 5));
  g.add(plaque("佛香阁", 4.4, y + 6.2, 9.1, m));
  g.add(batch.finish());
  return g;
}
export function architecture(scene, models, ground, m) {
  const groups = [],
    hits = [];
  for (const b of models) {
    if (b.name === "佛香阁") {
      const g = tower(b, m),
        coarse = tower(b, m, false);
      scene.add(g, coarse);
      g.userData.model = b;
      coarse.userData.model = b;
      hits.push(g, coarse);
      groups.push({ b, full: g, coarse });
      continue;
    }
    // Large annular footprints are courts/ruins, keep rings instead of filling courtyard voids.
    if (b.holes.length || b.w > 85 || b.d > 75) {
      const batch = new Batch(m);
      for (let i = 1; i < b.points.length; i++) {
        const a = b.points[i - 1],
          c = b.points[i],
          len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (len > 120) continue;
        batch.box(
          len,
          2.4,
          0.45,
          (a[0] + c[0]) / 2,
          b.base + 1.2,
          (a[1] + c[1]) / 2,
          "wall",
          -Math.atan2(c[1] - a[1], c[0] - a[0]),
        );
      }
      scene.add(batch.finish());
      continue;
    }
    const coarse = localHall(b, m, false);
    scene.add(coarse);
    const item = { b, coarse, full: null, last: 0 };
    groups.push(item);
    hits.push(coarse);
  }
  const packed = batchCoarseBuildings(scene, groups);
  hits.splice(
    0,
    hits.length,
    ...groups
      .filter((item) => item.b.id === "foxiang")
      .flatMap((item) => [item.full, item.coarse]),
    ...packed.meshes,
  );
  return {
    groups,
    hits,
    models,
    packed,
    update(camera, quality, time) {
      const near = quality === "low" ? 65 : quality === "medium" ? 160 : 240;
      for (const item of groups) {
        const dist = Math.hypot(
          camera.position.x - item.b.x,
          camera.position.z - item.b.z,
        );
        if (item.b.name === "佛香阁") {
          item.full.visible =
            dist < (quality === "low" ? 110 : quality === "medium" ? 260 : 450);
          item.coarse.visible = !item.full.visible;
          continue;
        }
        if (dist < near) {
          if (!item.full) {
            item.full = localHall(item.b, m, true);
            scene.add(item.full);
            hits.push(item.full);
          }
          item.last = time;
          item.coarse.visible = false;
          packed.setVisible(item, false);
          item.full.visible = true;
        } else {
          item.coarse.visible = dist < (quality === "low" ? 2300 : 5000);
          packed.setVisible(item, item.coarse.visible);
          if (item.full) item.full.visible = false;
        }
        // Keep a bounded local detail cache. Dispose cloned plaque textures with evicted geometry.
        if (item.full && dist > near * 2.5 && time - item.last > 25) {
          hits.splice(hits.indexOf(item.full), 1);
          disposeGroup(item.full, m);
          scene.remove(item.full);
          item.full = null;
        }
      }
    },
  };
}
export function disposeGroup(g, m) {
  g.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry) o.geometry.dispose();
    if (o.material && !Object.values(m).includes(o.material)) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}
function trimLine(points, length) {
  const out = [points[0]],
    segments = [];
  let done = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      rem = length - done;
    if (len <= rem) {
      out.push(b);
      done += len;
    } else {
      out.push([
        a[0] + ((b[0] - a[0]) * rem) / len,
        a[1] + ((b[1] - a[1]) * rem) / len,
      ]);
      break;
    }
  }
  return out;
}
function linePoint(points, at) {
  let remaining = at;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= len)
      return {
        x: a[0] + ((b[0] - a[0]) * remaining) / len,
        z: a[1] + ((b[1] - a[1]) * remaining) / len,
        yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    remaining -= len;
  }
  const p = points.at(-1);
  return { x: p[0], z: p[1], yaw: 0 };
}
export function corridor(scene, data, ground, m) {
  const original = data.paths.find((p) => p.id === "43978818"),
    points = trimLine(original.points, 728),
    cols = [],
    beams = [],
    paint = [],
    rafters = [],
    batch = new Batch(m);
  ground.coveredSurface = points.map((p) => ({ p, y: ground.natural(...p) }));
  const bays = 273,
    step = 728 / bays;
  for (let i = 0; i < bays; i++) {
    const a = linePoint(points, i * step),
      b = linePoint(points, (i + 1) * step),
      x = (a.x + b.x) / 2,
      z = (a.z + b.z) / 2,
      y = ground.height(x, z),
      yaw = -Math.atan2(b.z - a.z, b.x - a.x);
    batch.add(
      roofGeometry(step + 0.15, 4.5, 1.2, "gable", 5),
      "darkTile",
      x,
      y + 3.1,
      z,
      yaw,
    );
    batch.box(step, 0.18, 3.15, x, y - 0.03, z, "pave", yaw);
    for (const side of [-1, 1]) {
      const xx = a.x - Math.sin(-yaw) * side * 1.45,
        zz = a.z + Math.cos(-yaw) * side * 1.45;
      cols.push({ x: xx, y: y + 1.55, z: zz, sx: 0.16, sy: 3.1, sz: 0.16 });
      beams.push({
        x: x - Math.sin(-yaw) * side * 1.45,
        y: y + 2.8,
        z: z + Math.cos(-yaw) * side * 1.45,
        sx: step,
        sy: 0.3,
        sz: 0.16,
        ry: yaw,
      });
      paint.push({
        x: x - Math.sin(-yaw) * side * 1.46,
        y: y + 2.8,
        z: z + Math.cos(-yaw) * side * 1.46,
        sx: step * 0.91,
        sy: 0.19,
        sz: 0.18,
        ry: yaw,
      });
    }
    for (let k = 0; k < 6; k++)
      rafters.push({
        x: a.x + ((b.x - a.x) * (k + 0.5)) / 6,
        y: y + 3.03,
        z: a.z + ((b.z - a.z) * (k + 0.5)) / 6,
        sx: 0.08,
        sy: 0.1,
        sz: 4.2,
        ry: yaw,
      });
  }
  const g = batch.finish();
  g.add(
    instances(new T.CylinderGeometry(1, 1, 1, 8), m.red, cols),
    instances(new T.BoxGeometry(1, 1, 1), m.paint, beams),
    instances(new T.BoxGeometry(1, 1, 1), m.paint, paint),
    instances(new T.BoxGeometry(1, 1, 1), m.red, rafters),
  );
  scene.add(g);
  for (const [i, name] of ["清遥亭", "秋水亭", "寄澜亭", "留佳亭"].entries()) {
    const p = linePoint(points, [83, 250, 472, 645][i]);
    const base = ground.height(p.x, p.z),
      batch = new Batch(m);
    const c = [];
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      c.push({
        x: p.x + Math.cos(a) * 3.7,
        y: base + 2,
        z: p.z + Math.sin(a) * 3.7,
        sx: 0.23,
        sy: 4,
        sz: 0.23,
      });
    }
    batch.add(octRoof(5.2, 2), "darkTile", p.x, base + 4, p.z);
    batch.add(
      new T.CylinderGeometry(3, 3, 1.5, 8),
      "red",
      p.x,
      base + 5.1,
      p.z,
    );
    batch.add(octRoof(4.2, 2), "darkTile", p.x, base + 5.5, p.z);
    const g = batch.finish();
    g.add(instances(new T.CylinderGeometry(1, 1, 1, 10), m.red, c));
    scene.add(g);
  }
  // Protect corridor route from closed hall bounding boxes at Paiyun Gate.
  const model = {
    id: "corridor",
    name: "长廊",
    x: linePoint(points, 400).x,
    z: linePoint(points, 400).z,
    base: 1.2,
    h: 4.3,
    w: 728,
    d: 3,
    points,
    length: 728,
    bays: 273,
  };
  return { model, group: g, points, point: (at) => linePoint(points, at) };
}
function archBridge(scene, a, b, width, arches, rise, ground, m, name, id) {
  let len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (name === "十七孔桥") {
    const dx = (b[0] - a[0]) / len,
      dz = (b[1] - a[1]) / len,
      extend = (150 - len) / 2;
    a = [a[0] - dx * extend, a[1] - dz * extend];
    b = [b[0] + dx * extend, b[1] + dz * extend];
    len = 150;
  }
  const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]),
    g = new T.Group();
  g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
  g.rotation.y = yaw;
  const end = 1.23,
    height = (t) =>
      end +
      rise * Math.sin(Math.PI * t) +
      (name === "石舫登舫桥" ? 0.57 * t : 0),
    batch = new Batch(m),
    pier = 0.9,
    span = len / arches,
    posts = [],
    rails = [],
    lions = [];
  for (let i = 0; i < arches; i++) {
    const l = -len / 2 + i * span + 0.5 * pier,
      r = -len / 2 + (i + 1) * span - 0.5 * pier,
      center = (l + r) / 2,
      half = (r - l) / 2,
      top = height((i + 0.5) / arches) - 0.8,
      archHeight = Math.min(half, top - 0.4),
      spring = top - archHeight;
    const shape = new T.Shape();
    shape.moveTo(l, spring);
    shape.lineTo(l, height((l + len / 2) / len));
    for (let j = 1; j <= 8; j++) {
      const x = T.MathUtils.lerp(l, r, j / 8);
      shape.lineTo(x, height((x + len / 2) / len));
    }
    shape.lineTo(r, spring);
    for (let j = 1; j <= 24; j++) {
      const angle = (j / 24) * Math.PI;
      shape.lineTo(
        center + half * Math.cos(angle),
        spring + archHeight * Math.sin(angle),
      );
    }
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -width / 2);
    batch.add(geo, "stone");
    // Arch voussoir strips follow each curved intrados, giving visible masonry depth.
    for (let j = 0; j < 20; j++) {
      const t = ((j + 0.5) / 20) * Math.PI,
        x = center + half * Math.cos(t),
        y = spring + archHeight * Math.sin(t),
        mat = j % 2 ? "stone" : "pave";
      for (const side of [-1, 1]) {
        const geo = new T.BoxGeometry(0.1, 0.55, 0.09);
        geo.rotateZ(Math.atan2(archHeight * Math.cos(t), -half * Math.sin(t)));
        batch.add(geo, mat, x, y + 0.25, side * (width / 2 + 0.04));
      }
    }
  }
  for (let i = 0; i <= arches; i++) {
    const x = -len / 2 + i * span,
      top = height(i / arches);
    batch.box(pier, top + 2, width, x, (top - 2) / 2, 0, "stone");
  }
  const steps = Math.ceil(len / 0.6);
  for (let i = 0; i < steps; i++) {
    const x = -len / 2 + ((i + 0.5) * len) / steps,
      y = height((i + 0.5) / steps);
    batch.box(len / steps + 0.02, 0.16, width, x, y - 0.08, 0, "pave");
  }
  for (let i = 0; i <= Math.ceil(len / 1.65); i++) {
    const n = Math.ceil(len / 1.65),
      x = -len / 2 + (len * i) / n,
      y = height(i / n);
    for (const side of [-1, 1]) {
      posts.push({
        x,
        y: y + 0.55,
        z: side * (width / 2 - 0.16),
        sx: 0.25,
        sy: 1.1,
        sz: 0.25,
      });
      lions.push({
        x,
        y: y + 1.28,
        z: side * (width / 2 - 0.16),
        sx: 1,
        sy: 1,
        sz: 1,
      });
      if (i < n) {
        const yy = height((i + 0.5) / n);
        rails.push({
          x: x + len / n / 2,
          y: yy + 0.3,
          z: side * (width / 2 - 0.16),
          sx: len / n,
          sy: 0.27,
          sz: 0.18,
        });
        rails.push({
          x: x + len / n / 2,
          y: yy + 0.86,
          z: side * (width / 2 - 0.16),
          sx: len / n,
          sy: 0.17,
          sz: 0.21,
        });
      }
    }
  }
  g.add(
    batch.finish(),
    instances(new T.BoxGeometry(1, 1, 1), m.stone, posts),
    instances(new T.BoxGeometry(1, 1, 1), m.stone, rails),
    instances(lionGeometry(), m.stone, lions),
  );
  scene.add(g);
  ground.bridges.push({ id, name, a, b, width, height, length: len, arches });
  return {
    id,
    name,
    x: g.position.x,
    z: g.position.z,
    base: height(0.5),
    w: len,
    d: width,
    h: 3,
    group: g,
  };
}
export function bridges(scene, data, ground, m) {
  const models = [],
    remaining = data.paths
      .filter((p) => p.bridge && p.points.length > 1)
      .map((p) => ({ ...p, points: [...p.points] }));
  while (remaining.length) {
    const p = remaining.shift();
    let points = p.points,
      changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < remaining.length; i++) {
        const q = remaining[i];
        if (q.name !== p.name) continue;
        if (
          Math.hypot(
            ...[
              points.at(-1)[0] - q.points[0][0],
              points.at(-1)[1] - q.points[0][1],
            ],
          ) < 0.2
        ) {
          points = points.concat(q.points.slice(1));
          remaining.splice(i, 1);
          changed = true;
          break;
        }
        if (
          Math.hypot(
            points[0][0] - q.points.at(-1)[0],
            points[0][1] - q.points.at(-1)[1],
          ) < 0.2
        ) {
          points = q.points.slice(0, -1).concat(points);
          remaining.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
    const a = points[0],
      b = points.at(-1),
      len = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (len < 2) continue;
    const main = p.name === "十七孔桥",
      jade = p.name === "玉带桥" && len > 30;
    models.push(
      archBridge(
        scene,
        a,
        b,
        main ? 8 : jade ? 4 : 5,
        main ? 17 : p.name === "长桥" ? 3 : 1,
        main ? 5.8 : jade ? 6.5 : 2.7,
        ground,
        m,
        p.name || "园林桥",
        main ? "bridge" : p.id,
      ),
    );
    if (["练桥", "柳桥", "镜桥"].includes(p.name)) {
      const bb = models.at(-1);
      const hall = localHall(
        {
          name: p.name,
          x: bb.x,
          z: bb.z,
          w: 9,
          d: 7,
          h: 6.5,
          base: bb.base,
          yaw: 0,
          bays: 3,
          roofMat: "darkTile",
          pavilion: true,
        },
        m,
        true,
      );
      scene.add(hall);
    }
  }
  return models;
}
export function marbleBoat(scene, ground, m) {
  const x = -794.4,
    z = -752.5,
    yaw = 0.068,
    g = new T.Group(),
    batch = new Batch(m);
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const outline = [
    [-4, -18],
    [4, -18],
    [4.5, -14],
    [4.5, 11],
    [3.8, 15],
    [2, 18],
    [-2, 18],
    [-3.8, 15],
    [-4.5, 11],
    [-4.5, -14],
  ];
  batch.add(polygon(outline, [], 1.8), "boat", 0, -0.2, 0);
  batch.box(8.9, 0.25, 30, 0, 1.65, -1, "stone");
  for (const side of [-1, 1]) {
    const wheel = new T.CylinderGeometry(2.2, 2.2, 0.65, 32);
    wheel.rotateZ(Math.PI / 2);
    batch.add(wheel, "boat", side * 4.5, 1.05, -4);
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6;
      batch.box(
        0.7,
        0.12,
        2.1,
        side * 4.9,
        1.05 + Math.sin(a) * 1.05,
        -4 + Math.cos(a) * 1.05,
        "stone",
      );
    }
  }
  const columns = [],
    arches = [],
    bars = [];
  for (let level = 0; level < 2; level++) {
    const base = 1.8 + level * 3.7;
    batch.box(7.8, 0.32, 25, 0, base + 3.1, -1, "boat");
    batch.box(7.8, 0.35, 25, 0, base - 0.15, -1, "boat");
    for (const side of [-1, 1])
      for (let i = 0; i < 8; i++) {
        const zz = -12 + i * 3.1;
        columns.push({
          x: side * 3.6,
          y: base + 1.45,
          z: zz,
          sx: 0.28,
          sy: 2.9,
          sz: 0.28,
        });
        if (i < 7) {
          batch.box(
            0.1,
            1.3,
            2.5,
            side * 3.57,
            base + 1.25,
            zz + 1.55,
            "window",
          );
          for (let j = 0; j < 4; j++)
            bars.push({
              x: side * 3.65,
              y: base + 1.28,
              z: zz + 0.4 + j * 0.75,
              sx: 0.07,
              sy: 1.6,
              sz: 0.08,
            });
          const curve = new T.EllipseCurve(
            0,
            0,
            1.3,
            0.65,
            0,
            Math.PI,
            false,
            0,
          );
          const points = curve
            .getPoints(16)
            .map(
              (p) => new T.Vector3(side * 3.7, base + 2 + p.y, zz + 1.55 + p.x),
            );
          const geo = new T.TubeGeometry(
            new T.CatmullRomCurve3(points),
            16,
            0.09,
            5,
            false,
          );
          batch.add(geo, "boat");
        }
      }
    for (const side of [-1, 1])
      batch.box(0.2, 0.16, 24.5, side * 3.6, base + 0.08, -1, "boat");
  }
  batch.box(8.6, 0.4, 26, 0, 9.45, -1, "boat");
  batch.box(8.9, 0.17, 26.5, 0, 9.78, -1, "stone");
  boatCarving(batch, m);
  g.add(
    instances(new T.CylinderGeometry(1, 1, 1, 10), m.boat, columns),
    instances(new T.BoxGeometry(1, 1, 1), m.boat, bars),
    batch.finish(),
  );
  scene.add(g);
  // Shore connection is a narrow gangway, stone hull remains a fixed pavilion.
  ground.platforms.push({ x, z, w: 8.7, d: 36, y: 1.8, yaw });
  const dx = Math.sin(yaw) * 15,
    dz = Math.cos(yaw) * 15;
  ground.bridges.push({
    id: "boat-deck",
    name: "石舫甲板",
    a: [x - dx, z - dz],
    b: [x + dx, z + dz],
    width: 7.6,
    height: () => 1.8,
    length: 30,
    arches: 0,
  });
  const a = [-800, -780],
    b = [x - Math.sin(yaw) * 16, z - Math.cos(yaw) * 16];
  archBridge(scene, a, b, 2.5, 1, 0.2, ground, m, "石舫登舫桥", "boat-bridge");
  return {
    id: "boat",
    name: "石舫",
    x,
    z,
    base: 1.8,
    w: 9,
    d: 36,
    h: 10,
    group: g,
    spawn: [-795, -779],
  };
}
