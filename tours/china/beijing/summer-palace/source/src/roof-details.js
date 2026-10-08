import * as T from "three";
import { roofGeometry } from "./geometry.js";
// Continuous raised tile rolls: merged into one mesh per material, never a mesh per tile.
function roll(batch, points, material, r = 0.07) {
  batch.add(
    new T.TubeGeometry(new T.CatmullRomCurve3(points), 14, r, 5, false),
    material,
  );
}
export function hipTiles(batch, w, d, h, y, material = "ridge") {
  const ridge = Math.max(0, w / 2 - d * 0.36),
    rise = (t) => h * (1 - t) ** 1.65;
  for (const side of [-1, 1])
    for (let s = -1; s <= 1; s += 0.28 / (w / 2)) {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14,
          x = s * (ridge + (w / 2 - ridge) * t),
          z = ((side * d) / 2) * t;
        pts.push(
          new T.Vector3(
            x,
            y +
              rise(t) +
              Math.min(0.65, h * 0.12) * Math.abs(s) ** 8 * t ** 6 +
              0.04,
            z,
          ),
        );
      }
      roll(batch, pts, material, 0.055);
    }
  for (const side of [-1, 1])
    for (let s = -0.98; s <= 0.98; s += 0.3 / (d / 2)) {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14;
        pts.push(
          new T.Vector3(
            side * (ridge + (w / 2 - ridge) * t),
            y +
              rise(t) +
              Math.min(0.65, h * 0.12) * Math.abs(s) ** 8 * t ** 6 +
              0.04,
            ((s * d) / 2) * t,
          ),
        );
      }
      roll(batch, pts, material, 0.055);
    }
  for (const side of [-1, 1])
    for (let x = -w / 2; x < w / 2; x += 0.28) {
      const t = Math.abs(x) / (w / 2),
        yy = y + Math.min(0.65, h * 0.12) * t ** 8;
      const cap = new T.CylinderGeometry(0.082, 0.082, 0.13, 8);
      cap.rotateX(Math.PI / 2);
      batch.add(cap, material, x, yy, (side * d) / 2);
    }
}
export function octTiles(batch, radius, h, y, material = "ridge") {
  for (let face = 0; face < 8; face++) {
    const a = (face * Math.PI) / 4 + Math.PI / 8,
      b = a + Math.PI / 4,
      n = Math.ceil((2 * radius * Math.sin(Math.PI / 8)) / 0.28);
    for (let i = 0; i <= n; i++) {
      const u = i / n,
        edge = new T.Vector3(
          T.MathUtils.lerp(Math.cos(a), Math.cos(b), u) * radius,
          0,
          T.MathUtils.lerp(Math.sin(a), Math.sin(b), u) * radius,
        ),
        pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14;
        pts.push(
          new T.Vector3(
            edge.x * t,
            y + h * (1 - t) ** 1.65 + 0.6 * t ** 6 + 0.045,
            edge.z * t,
          ),
        );
      }
      roll(batch, pts, material, 0.065);
    }
    for (const angle of [a]) {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14;
        pts.push(
          new T.Vector3(
            Math.cos(angle) * radius * t,
            y + h * (1 - t) ** 1.65 + 0.6 * t ** 6 + 0.1,
            Math.sin(angle) * radius * t,
          ),
        );
      }
      roll(batch, pts, "greenTile", 0.14);
    }
  }
}
export function gableHip(batch, w, d, h, y, material) {
  batch.add(roofGeometry(w, d, h * 0.4, "gable-skirt", 16), material, 0, y, 0);
  batch.add(
    roofGeometry(w * 0.8, d * 0.5, h * 0.6, "gable", 16),
    material,
    0,
    y + h * 0.4,
    0,
  );
  const pos = [],
    uv = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 32; i++) {
      const z0 = -d * 0.25 + (i / 32) * d * 0.5,
        z1 = -d * 0.25 + ((i + 1) / 32) * d * 0.5,
        top = (z) => h * 0.6 * (1 - Math.abs(z) / (d * 0.25)) ** 1.65;
      for (const p of [
        [side * w * 0.4, 0, z0],
        [side * w * 0.4, top(z0), z0],
        [side * w * 0.4, top(z1), z1],
        [side * w * 0.4, 0, z0],
        [side * w * 0.4, top(z1), z1],
        [side * w * 0.4, 0, z1],
      ]) {
        pos.push(...p);
        uv.push(p[2], p[1]);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  batch.add(g, "gable", 0, y + h * 0.4, 0);
  const tile = material === "tile" ? "ridge" : "darkTile";
  for (const side of [-1, 1])
    for (let x = -w * 0.4; x <= w * 0.4; x += 0.28) {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14;
        pts.push(
          new T.Vector3(
            x,
            y +
              h * 0.4 +
              h * 0.6 * (1 - t) ** 1.65 +
              Math.min(0.65, h * 0.072) *
                (Math.abs(x) / (w * 0.4)) ** 8 *
                t ** 6 +
              0.05,
            side * d * 0.25 * t,
          ),
        );
      }
      roll(batch, pts, tile, 0.055);
    }
  for (const side of [-1, 1])
    for (let s = -1; s <= 1; s += 0.28 / (w / 2)) {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14;
        pts.push(
          new T.Vector3(
            s * (w * 0.4 + w * 0.1 * t),
            y +
              h * 0.4 * (1 - t) ** 1.65 +
              Math.min(0.65, h * 0.048) * Math.abs(s) ** 8 * t ** 6 +
              0.05,
            side * (d * 0.25 + d * 0.25 * t),
          ),
        );
      }
      roll(batch, pts, tile, 0.055);
    }
}
