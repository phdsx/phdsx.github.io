import * as T from "three";
import { Batch, polygon, inside, distanceToSegment } from "./geometry.js";
import { random, animateWater } from "./materials.js";
export const segment = (x, z, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = T.MathUtils.clamp(
      ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
      0,
      1,
    );
  return { t, d: Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) };
};
export class Ground {
  constructor(data, dem) {
    this.data = data;
    this.dem = dem;
    this.platforms = [];
    this.patches = [];
    this.ramps = [];
    this.routes = [];
    this.bridges = [];
    this.waterAreas = data.water.map((w) => ({
      ...w,
      y: 0,
      bounds: this.bounds(w.points),
    }));
    this.obstacles = [];
    this.pathGrid = new Map();
    this.shoreGrid = new Map();
    for (const w of this.waterAreas)
      for (const ring of [w.points, ...w.holes])
        for (let i = 1; i < ring.length; i++)
          this.index(this.shoreGrid, { a: ring[i - 1], b: ring[i] }, 14);
    for (const p of data.paths)
      for (let i = 1; i < p.points.length; i++) {
        const a = p.points[i - 1],
          b = p.points[i],
          s = { a, b, w: p.width, steps: p.steps, bridge: p.bridge, id: p.id };
        this.index(this.pathGrid, s, p.width + 2);
        this.routes.push(s);
      }
  }
  bounds(p) {
    return [
      Math.min(...p.map((v) => v[0])),
      Math.max(...p.map((v) => v[0])),
      Math.min(...p.map((v) => v[1])),
      Math.max(...p.map((v) => v[1])),
    ];
  }
  index(grid, s, r) {
    const bounds = this.bounds([s.a, s.b]);
    for (
      let i = Math.floor((bounds[0] - r) / 32);
      i <= Math.floor((bounds[1] + r) / 32);
      i++
    )
      for (
        let j = Math.floor((bounds[2] - r) / 32);
        j <= Math.floor((bounds[3] + r) / 32);
        j++
      ) {
        const key = i + "," + j;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(s);
      }
  }
  get(grid, x, z) {
    return grid.get(Math.floor(x / 32) + "," + Math.floor(z / 32)) || [];
  }
  raw(x, z) {
    const d = this.dem,
      u = T.MathUtils.clamp((x - d.x0) / d.step, 0, d.nx - 1.001),
      v = T.MathUtils.clamp((z - d.z0) / d.step, 0, d.nz - 1.001),
      i = Math.floor(u),
      j = Math.floor(v),
      a = u - i,
      b = v - j;
    return T.MathUtils.lerp(
      T.MathUtils.lerp(d.heights[j * d.nx + i], d.heights[j * d.nx + i + 1], a),
      T.MathUtils.lerp(
        d.heights[(j + 1) * d.nx + i],
        d.heights[(j + 1) * d.nx + i + 1],
        a,
      ),
      b,
    );
  }
  waterAt(x, z) {
    return this.waterAreas.find(
      (w) =>
        x >= w.bounds[0] &&
        x <= w.bounds[1] &&
        z >= w.bounds[2] &&
        z <= w.bounds[3] &&
        inside(x, z, w.points) &&
        !w.holes.some((h) => inside(x, z, h)),
    );
  }
  natural(x, z) {
    if (this.waterAt(x, z)) return -2.6;
    let y = Math.max(1.2, this.raw(x, z));
    let dist = 20;
    for (const s of this.get(this.shoreGrid, x, z))
      dist = Math.min(dist, distanceToSegment(x, z, s.a, s.b));
    if (dist < 14)
      y = T.MathUtils.lerp(1.2, y, T.MathUtils.smoothstep(dist, 0, 14));
    return y;
  }
  platformAt(x, z) {
    return this.platforms.find((p) => {
      const dx = x - p.x,
        dz = z - p.z,
        u = dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw),
        v = dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw);
      return Math.abs(u) <= p.w / 2 && Math.abs(v) <= p.d / 2;
    });
  }
  bridgeAt(x, z) {
    for (const b of this.bridges) {
      const s = segment(x, z, b.a, b.b);
      if (s.d < b.width / 2 - 0.25 && s.t >= 0 && s.t <= 1)
        return { ...b, t: s.t, height: b.height(s.t) };
    }
    return null;
  }
  pathHeight(x, z) {
    let h = null,
      d = 1e6;
    for (const s of this.get(this.pathGrid, x, z)) {
      if (s.bridge) continue;
      const p = segment(x, z, s.a, s.b);
      if (p.d <= s.w / 2 + 0.4 && p.d < d) {
        h = T.MathUtils.lerp(this.natural(...s.a), this.natural(...s.b), p.t);
        d = p.d;
      }
    }
    return h;
  }
  rampAt(x, z) {
    let hit = null,
      best = Infinity;
    for (const r of this.ramps) {
      const s = segment(x, z, r.a, r.b);
      const score = s.d + (r.name.startsWith("佛香阁") ? -100 : 0);
      if (s.d < r.width / 2 && score < best) {
        hit = { ...r, t: s.t, y: T.MathUtils.lerp(r.y0, r.y1, s.t) };
        best = score;
      }
    }
    return hit;
  }
  coveredHeight(x, z) {
    let hit = null,
      best = 2;
    for (let i = 1; i < (this.coveredSurface?.length || 0); i++) {
      const a = this.coveredSurface[i - 1],
        b = this.coveredSurface[i],
        s = segment(x, z, a.p, b.p);
      if (s.d < best) {
        hit = T.MathUtils.lerp(a.y, b.y, s.t);
        best = s.d;
      }
    }
    return hit;
  }
  patchAt(x, z) {
    return this.patches.find((p) => inside(x, z, p.points));
  }
  terrainHeight(x, z) {
    if (this.waterAt(x, z)) return -2.6;
    const r = this.rampAt(x, z);
    if (r) return r.y;
    const covered = this.coveredHeight(x, z);
    if (covered !== null) return covered;
    const p = this.platformAt(x, z);
    if (p) return p.y;
    const patch = this.patchAt(x, z);
    if (patch) return patch.y;
    return this.pathHeight(x, z) ?? this.natural(x, z);
  }
  height(x, z) {
    const bridge = this.bridgeAt(x, z);
    if (bridge) return bridge.height;
    return this.terrainHeight(x, z);
  }
}
function strip(points, width, height, mat, scene) {
  const pos = [],
    uv = [];
  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (!len) continue;
    const nx = ((-dz / len) * width) / 2,
      nz = ((dx / len) * width) / 2,
      count = Math.max(1, Math.ceil(len / 3));
    for (let j = 0; j < count; j++) {
      const t = j / count,
        u = (j + 1) / count;
      const p = [a[0] + t * dx, a[1] + t * dz],
        q = [a[0] + u * dx, a[1] + u * dz];
      const vertices = [
        [p[0] - nx, height(...p, t), p[1] - nz],
        [p[0] + nx, height(...p, t), p[1] + nz],
        [q[0] + nx, height(...q, u), q[1] + nz],
        [q[0] - nx, height(...q, u), q[1] - nz],
      ];
      for (const k of [0, 2, 1, 0, 3, 2]) {
        pos.push(...vertices[k]);
        uv.push(
          k === 0 || k === 3 ? 0 : width,
          accumulated + (k < 2 ? t : u) * len,
        );
      }
    }
    accumulated += len;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
export function landscape(scene, ground, m) {
  const d = ground.dem,
    g = new T.Group();
  const geo = new T.PlaneGeometry(
    (d.nx - 1) * d.step,
    (d.nz - 1) * d.step,
    d.nx - 1,
    d.nz - 1,
  );
  geo.rotateX(-Math.PI / 2);
  geo.translate(
    d.x0 + ((d.nx - 1) * d.step) / 2,
    0,
    d.z0 + ((d.nz - 1) * d.step) / 2,
  );
  const pos = geo.attributes.position,
    colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = ground.terrainHeight(x, z);
    pos.setY(i, y);
    const c = new T.Color("#c5d5af").multiplyScalar(0.9 + random() * 0.18);
    colors.push(c.r, c.g, c.b);
  }
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const indices = geo.index.array,
    keep = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i],
      b = indices[i + 1],
      c = indices[i + 2],
      x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
      z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    if (inside(x, z, ground.data.boundary)) keep.push(a, b, c);
  }
  geo.setIndex(keep);
  geo.computeVertexNormals();
  const earth = m.earth.clone();
  earth.vertexColors = true;
  const mesh = new T.Mesh(geo, earth);
  mesh.receiveShadow = true;
  g.add(mesh);
  animateWater(m.water);
  for (const w of ground.waterAreas) {
    const geo = polygon(w.points, w.holes, 0.1);
    const mesh = new T.Mesh(geo, m.water);
    mesh.position.y = -0.1;
    mesh.receiveShadow = false;
    g.add(mesh);
    for (const ring of [w.points, ...w.holes])
      strip(ring, 1.2, () => 1.21, m.stone, g);
  }
  for (const p of ground.data.paths) {
    if (p.bridge) continue;
    strip(
      p.points,
      p.name === "东堤" ? 7 : p.name === "西堤" ? 6 : p.width,
      (x, z) => ground.height(x, z) + 0.07,
      m.pave,
      g,
    );
  }
  const batch = new Batch(m);
  for (const w of ground.data.walls) {
    for (let i = 1; i < w.points.length; i++) {
      const a = w.points[i - 1],
        b = w.points[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        x = (a[0] + b[0]) / 2,
        z = (a[1] + b[1]) / 2;
      batch.box(
        len,
        2.7,
        0.6,
        x,
        ground.natural(x, z) + 1.35,
        z,
        "wall",
        -Math.atan2(b[1] - a[1], b[0] - a[0]),
      );
      ground.obstacles.push({
        a,
        b,
        radius: 0.5,
        yMin: ground.natural(x, z),
        yMax: ground.natural(x, z) + 2.7,
      });
    }
  }
  // Perimeter follows OSM park boundary, with deliberate entrance breaks near mapped gates.
  const gates = ground.data.buildings
    .filter((b) => b.name.includes("宫门"))
    .map((b) => [b.x, b.z]);
  gates.push([74.533, 36.802]);
  for (let i = 1; i < ground.data.boundary.length; i++) {
    const a = ground.data.boundary[i - 1],
      b = ground.data.boundary[i],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.ceil(len / 8);
    for (let j = 0; j < n; j++) {
      const p = [
          T.MathUtils.lerp(a[0], b[0], j / n),
          T.MathUtils.lerp(a[1], b[1], j / n),
        ],
        q = [
          T.MathUtils.lerp(a[0], b[0], (j + 1) / n),
          T.MathUtils.lerp(a[1], b[1], (j + 1) / n),
        ],
        x = (p[0] + q[0]) / 2,
        z = (p[1] + q[1]) / 2;
      if (gates.some((v) => Math.hypot(v[0] - x, v[1] - z) < 16)) continue;
      batch.box(
        len / n,
        2.3,
        0.6,
        x,
        ground.natural(x, z) + 1.15,
        z,
        "wall",
        -Math.atan2(q[1] - p[1], q[0] - p[0]),
      );
      ground.obstacles.push({
        a: p,
        b: q,
        radius: 0.4,
        yMin: ground.natural(x, z),
        yMax: ground.natural(x, z) + 2.3,
      });
    }
  }
  g.add(batch.finish());
  scene.add(g);
  return { group: g, water: m.water };
}
export function pathStrip(points, width, ground, mat, scene) {
  return strip(points, width, (x, z) => ground.height(x, z) + 0.05, mat, scene);
}
