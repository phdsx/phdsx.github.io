import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
const matrix = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  v = new THREE.Vector3();
export class Batch {
  constructor(materials) {
    this.materials = materials;
    this.parts = new Map();
  }
  add(geometry, material, x = 0, y = 0, z = 0, ry = 0) {
    geometry.applyMatrix4(
      matrix.compose(
        v.set(x, y, z),
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    const a = this.parts.get(material) || [];
    a.push(
      geometry.toNonIndexed
        ? geometry.index
          ? geometry.toNonIndexed()
          : geometry
        : geometry,
    );
    if (geometry.index) geometry.dispose();
    this.parts.set(material, a);
  }
  box(w, h, d, x, y, z, mat, ry = 0) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const g = new THREE.BoxGeometry(w, h, d),
      p = g.attributes.position,
      n = g.attributes.normal,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, p.getX(i), p.getZ(i));
      else if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, p.getZ(i), p.getY(i));
      else uv.setXY(i, p.getX(i), p.getY(i));
    }
    this.add(g, mat, x, y, z, ry);
  }
  finish() {
    const g = new THREE.Group();
    for (const [key, parts] of this.parts) {
      const geo = mergeGeometries(parts, false);
      const m = new THREE.Mesh(geo, this.materials[key]);
      m.castShadow = key !== "water";
      m.receiveShadow = true;
      g.add(m);
      for (const p of parts) p.dispose();
    }
    this.parts.clear();
    return g;
  }
}
export function polygon(points, holes = [], height = 1) {
  const shape = new THREE.Shape(
    points.map((p) => new THREE.Vector2(p[0], -p[1])),
  );
  for (const hole of holes)
    shape.holes.push(
      new THREE.Path(hole.map((p) => new THREE.Vector2(p[0], -p[1]))),
    );
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
export function inside(x, z, points) {
  let c = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i],
      [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      c = !c;
  }
  return c;
}
export function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(
        1,
        ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
// Curved sweep: every roof face has a rising eave and concave profile, rather than a flat pyramid.
export function roofGeometry(w, d, height, type = "hip", steps = 12) {
  const positions = [],
    uv = [],
    ridge =
      type === "pyramid"
        ? 0
        : type === "gable"
          ? w / 2
          : type === "gable-skirt"
            ? w * 0.4
            : type === "truncated"
              ? w * 0.28
              : Math.max(0, w / 2 - d * 0.36);
  const rectTop =
    type === "truncated" ? d * 0.23 : type === "gable-skirt" ? d * 0.25 : 0;
  function point(face, s, t) {
    let x, z;
    if (face < 2) {
      const half = ridge + (w / 2 - ridge) * t;
      x = s * half;
      z = (rectTop + (d / 2 - rectTop) * t) * (face === 0 ? 1 : -1);
    } else {
      x = (ridge + (w / 2 - ridge) * t) * (face === 2 ? 1 : -1);
      z = s * (rectTop + (d / 2 - rectTop) * t);
    }
    const corner = Math.abs(s) ** 8 * t ** 6;
    const y = height * (1 - t) ** 1.65 + Math.min(0.65, height * 0.12) * corner;
    return [x, y, z];
  }
  const faces = type === "gable" ? 2 : 4;
  for (let f = 0; f < faces; f++)
    for (let j = 0; j < steps; j++)
      for (let i = 0; i < steps; i++) {
        const s = (i / steps) * 2 - 1,
          S = ((i + 1) / steps) * 2 - 1,
          t = j / steps,
          T = (j + 1) / steps;
        const ps = [
          point(f, s, t),
          point(f, S, t),
          point(f, S, T),
          point(f, s, T),
        ];
        for (const k of f === 0 || f === 3
          ? [0, 2, 1, 0, 3, 2]
          : [0, 1, 2, 0, 2, 3]) {
          positions.push(...ps[k]);
          uv.push(
            f < 2 ? (ps[k][0] + w / 2) / 1.6 : (ps[k][2] + d / 2) / 1.6,
            f < 2 ? (ps[k][2] + d / 2) / 1.6 : (ps[k][0] + w / 2) / 1.6,
          );
        }
      }
  if (type === "truncated" || type === "gable-skirt") {
    const pts = [
      [-ridge, height, -rectTop],
      [ridge, height, -rectTop],
      [ridge, height, rectTop],
      [-ridge, height, rectTop],
    ];
    for (const k of [0, 2, 1, 0, 3, 2]) {
      positions.push(...pts[k]);
      uv.push(pts[k][0], pts[k][2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const smooth = mergeVertices(g, 1e-4);
  g.dispose();
  smooth.computeVertexNormals();
  return smooth;
}
export function roof(batch, b, type = "hip", double = false) {
  const { x, z, w, d, h, base = 0 } = b,
    body = h * (double ? 0.39 : 0.55),
    upperY = base + (double ? h * 0.66 : body),
    rise = base + h - upperY;
  const yaw = b.yaw || 0;
  if (double) {
    batch.add(
      roofGeometry(
        w + 3,
        d + 3,
        h * 0.16,
        type === "pyramid" ? "pyramid" : "hip",
        10,
      ),
      "tile",
      x,
      base + body,
      z,
      yaw,
    );
    batch.box(
      w * 0.88,
      h * 0.24,
      d * 0.86,
      x,
      base + body + h * 0.12,
      z,
      "red",
      yaw,
    );
  }
  const roofW = double ? w * 0.9 + 2 : w + 3,
    roofD = double ? d * 0.88 + 2 : d + 3;
  if (type === "gablehip") {
    // A four-slope skirt meets the two-slope upper roof. Curved end gables follow
    // the same roof sweep, so no rectangular gable box intersects the tile surface.
    batch.add(
      roofGeometry(roofW, roofD, rise * 0.4, "gable-skirt", 12),
      "tile",
      x,
      upperY,
      z,
      yaw,
    );
    batch.add(
      roofGeometry(roofW * 0.8, roofD * 0.5, rise * 0.6, "gable", 12),
      "tile",
      x,
      upperY + rise * 0.4,
      z,
      yaw,
    );
    const pos = [],
      tex = [];
    for (const sign of [-1, 1]) {
      const curve = [];
      for (let i = 0; i <= 24; i++) {
        const zz = ((i / 24) * 2 - 1) * roofD * 0.25,
          t = Math.abs((i / 24) * 2 - 1),
          yy = rise * 0.6 * (1 - t) ** 1.65;
        curve.push([sign * roofW * 0.4, yy, zz]);
      }
      for (let i = 1; i < curve.length; i++) {
        const verts = [[sign * roofW * 0.4, 0, 0], curve[i - 1], curve[i]];
        for (const p of sign > 0 ? verts : verts.toReversed()) {
          pos.push(...p);
          tex.push(p[2], p[1]);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(tex, 2));
    g.computeVertexNormals();
    batch.add(g, "gable", x, upperY + rise * 0.4, z, yaw);
  } else
    batch.add(
      roofGeometry(roofW, roofD, rise, type, 12),
      "tile",
      x,
      upperY,
      z,
      yaw,
    );
  if (type !== "pyramid" && type !== "truncated")
    batch.box(
      Math.max(1, roofW - roofD * 0.75),
      0.5,
      0.42,
      x,
      base + h - 0.25,
      z,
      "ridge",
      yaw,
    );
  if (type === "pyramid") {
    const geo = new THREE.SphereGeometry(0.65, 10, 8);
    geo.scale(1, 1.4, 1);
    batch.add(geo, "gold", x, base + h + 0.4, z);
  }
}
export function instances(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const obj = new THREE.Object3D();
  transforms.forEach((t, i) => {
    obj.position.set(t.x, t.y, t.z);
    obj.rotation.set(0, t.ry || 0, t.rz || 0);
    obj.scale.set(t.sx || 1, t.sy || 1, t.sz || 1);
    obj.updateMatrix();
    mesh.setMatrixAt(i, obj.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}
export function railing(batch, x, z, w, d, y, openings = 8) {
  const posts = [],
    panels = [];
  for (let side = 0; side < 4; side++) {
    const horizontal = side < 2,
      len = horizontal ? w : d,
      count = Math.max(2, Math.floor(len / 2.7));
    for (let i = 0; i <= count; i++) {
      const a = -len / 2 + (len * i) / count;
      if (horizontal && Math.abs(a) < openings) continue;
      posts.push({
        x: x + (horizontal ? a : side === 2 ? -w / 2 : w / 2),
        y: y + 0.65,
        z: z + (horizontal ? (side === 0 ? -d / 2 : d / 2) : a),
      });
      if (
        i < count &&
        (!horizontal || Math.abs(a + len / count / 2) > openings)
      ) {
        panels.push({
          x:
            x +
            (horizontal ? a + len / count / 2 : side === 2 ? -w / 2 : w / 2),
          y: y + 0.5,
          z:
            z +
            (horizontal ? (side === 0 ? -d / 2 : d / 2) : a + len / count / 2),
          sx: horizontal ? len / count : 0.17,
          sy: 0.6,
          sz: horizontal ? 0.17 : len / count,
        });
      }
    }
  }
  const g = new THREE.Group();
  g.add(
    instances(
      new THREE.BoxGeometry(0.24, 1.3, 0.24),
      batch.materials.stone,
      posts,
    ),
  );
  g.add(
    instances(new THREE.BoxGeometry(1, 1, 1), batch.materials.stone, panels),
  );
  return g;
}
