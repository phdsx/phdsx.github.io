import * as T from "three";
import {
  Batch,
  roofGeometry,
  instances,
  distanceToSegment,
} from "./geometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export function towerJoinery(batch, b) {
  for (let floor = 0; floor < 3; floor++) {
    const bottom = b.base + floor * 9.8,
      r = 9.7 - floor * 0.65,
      hh = 8.7;
    for (let face = 0; face < 8; face++) {
      const a = (face * Math.PI) / 4 + Math.PI / 4,
        len = 2 * r * Math.sin(Math.PI / 8),
        yaw = -a - Math.PI / 2,
        cx = Math.cos(a) * r * 0.88,
        cz = Math.sin(a) * r * 0.88;
      for (let j = 0; j < 16; j++)
        batch.box(
          len * 0.95,
          0.045,
          0.08,
          cx,
          bottom + 1.8 + j * 0.32,
          cz,
          "wood",
          yaw,
        );
      batch.box(
        len,
        0.65,
        0.4,
        Math.cos(a) * r * 0.924,
        bottom + hh - 1.15,
        Math.sin(a) * r * 0.924,
        "paint",
        yaw,
      );
      for (let j = 0; j <= Math.ceil(len / 0.27); j++) {
        const u = (j / Math.ceil(len / 0.27) - 0.5) * len,
          x = Math.cos(a) * (r + 1.45) - Math.sin(a) * u,
          z = Math.sin(a) * (r + 1.45) + Math.cos(a) * u;
        batch.box(0.1, 0.14, 2.25, x, bottom + hh - 0.13, z, "red", -a);
        const cap = new T.SphereGeometry(0.075, 7, 5);
        batch.add(
          cap,
          "boat",
          Math.cos(a) * (r + 2.1) - Math.sin(a) * u,
          bottom + hh - 0.1,
          Math.sin(a) * (r + 2.1) + Math.cos(a) * u,
        );
      }
      for (const u of [-len * 0.28, 0, len * 0.28])
        for (let k = 0; k < 4; k++) {
          const rr = r * 0.93 + k * 0.16;
          batch.box(
            0.32,
            0.13,
            0.9 + k * 0.3,
            Math.cos(a) * rr - Math.sin(a) * u,
            bottom + hh - 1 + k * 0.18,
            Math.sin(a) * rr + Math.cos(a) * u,
            "paint",
            -a,
          );
        }
    }
  }
}
export function lionGeometry() {
  const parts = [];
  function sphere(x, y, z, w, h, d) {
    const g = new T.SphereGeometry(1, 10, 8);
    g.scale(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  }
  sphere(0, 0.14, 0, 0.19, 0.31, 0.16);
  sphere(0, 0.46, 0.055, 0.2, 0.2, 0.19);
  sphere(0, 0.43, 0.18, 0.13, 0.08, 0.12);
  for (const x of [-0.12, 0.12]) {
    sphere(x, 0.55, 0.02, 0.07, 0.08, 0.055);
    sphere(x, -0.08, 0.09, 0.075, 0.2, 0.075);
    sphere(x, -0.24, 0.15, 0.1, 0.07, 0.14);
  }
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI * 0.2;
    sphere(
      Math.cos(a) * 0.16,
      0.44 + Math.sin(a) * 0.17,
      -0.035,
      0.065,
      0.065,
      0.06,
    );
  }
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}
export function gardenDetails(scene, ground, models, m) {
  const batch = new Batch(m),
    columns = [];
  // Use mapped walkways around the actual Xiequ pool. Cover only clear waterside sections.
  let galleryBays = 0;
  for (const p of ground.data.paths) {
    for (let i = 1; i < p.points.length; i++) {
      const a = p.points[i - 1],
        b = p.points[i],
        cx = (a[0] + b[0]) / 2,
        cz = (a[1] + b[1]) / 2,
        len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (
        cx < 195 ||
        cx > 307 ||
        cz < -1090 ||
        cz > -975 ||
        p.bridge ||
        len > 45 ||
        len < 3
      )
        continue;
      const close = ground.waterAreas.find((w) => w.id === "341357971");
      let dist = 100;
      for (let j = 1; j < close.points.length; j++)
        dist = Math.min(
          dist,
          distanceToSegment(cx, cz, close.points[j - 1], close.points[j]),
        );
      if (dist > 13 || ground.waterAt(cx, cz)) continue;
      const n = Math.ceil(len / 2.6),
        yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n,
          x = T.MathUtils.lerp(a[0], b[0], t),
          z = T.MathUtils.lerp(a[1], b[1], t),
          y = ground.height(x, z);
        if (
          models.some(
            (v) => Math.hypot(x - v.x, z - v.z) < Math.min(v.w, v.d) / 2 + 1,
          )
        )
          continue;
        batch.add(
          roofGeometry(len / n + 0.25, 3.7, 1, "gable", 8),
          "darkTile",
          x,
          y + 3,
          z,
          yaw,
        );
        batch.box(len / n, 0.27, 0.22, x, y + 2.7, z, "paint", yaw);
        for (const side of [-1, 1])
          columns.push({
            x: x - Math.sin(-yaw) * side * 1.15,
            y: y + 1.5,
            z: z + Math.cos(-yaw) * side * 1.15,
            sx: 0.16,
            sy: 3,
            sz: 0.16,
          });
        galleryBays++;
      }
    }
  }
  // Perimeter garden screens and carefully opened courtyard side walls, photo-inferred elevations.
  for (const p of ground.patches) {
    const [a, b, c, d] = p.points;
    for (const [u, v] of [
      [a, d],
      [b, c],
    ]) {
      const len = Math.hypot(u[0] - v[0], u[1] - v[1]),
        x = (u[0] + v[0]) / 2,
        z = (u[1] + v[1]) / 2;
      if (
        ground.data.paths.some((path) =>
          path.points.some((q) => distanceToSegment(...q, u, v) < 3),
        )
      )
        continue;
      const yaw = -Math.atan2(v[1] - u[1], v[0] - u[0]);
      batch.box(len, 1.6, 0.3, x, p.y + 0.8, z, "wall", yaw);
      batch.add(
        roofGeometry(len + 0.3, 0.85, 0.32, "gable", 4),
        "darkTile",
        x,
        p.y + 1.6,
        z,
        yaw,
      );
      ground.obstacles.push({
        a: u,
        b: v,
        radius: 0.25,
        yMin: p.y,
        yMax: p.y + 1.9,
      });
    }
  }
  const group = batch.finish();
  group.add(instances(new T.CylinderGeometry(1, 1, 1, 8), m.red, columns));
  scene.add(group);
  return { group, galleryBays };
}
