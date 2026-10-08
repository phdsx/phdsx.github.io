import * as T from "three";
import { inside, distanceToSegment, instances } from "./geometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { random } from "./materials.js";
function atlas(pine = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  function leaf(x, y, size, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(-size, 0, size, 0);
    g.addColorStop(0, "#143b20");
    g.addColorStop(0.45, "#5d7e3c");
    g.addColorStop(0.7, "#8b9c59");
    g.addColorStop(1, "#294d26");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.54, size, 0);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.55, -size, 0);
    ctx.fill();
    ctx.strokeStyle = "#a7a36477";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    ctx.restore();
  }
  for (let branch = 0; branch < 12; branch++) {
    const a = (branch * Math.PI * 2) / 12 + random() * 0.3,
      len = 110 + random() * 125;
    ctx.strokeStyle = "#46582ddd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(250, 280);
    ctx.quadraticCurveTo(
      250 + Math.sin(a) * len * 0.5,
      280 - Math.cos(a) * len * 0.55,
      250 + Math.sin(a) * len,
      280 - Math.cos(a) * len,
    );
    ctx.stroke();
    for (let i = 0; i < 280; i++) {
      const t = random(),
        x = 250 + Math.sin(a) * len * t + (random() - 0.5) * 90,
        y = 280 - Math.cos(a) * len * t + (random() - 0.5) * 90;
      leaf(x, y, pine ? 3 + random() * 4 : 4 + random() * 5, a + random() * 2);
    }
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return new T.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.42,
    side: T.DoubleSide,
    roughness: 1,
    color: pine ? "#b7c4b3" : "#d2dbbc",
  });
}
function branches() {
  const parts = [];
  const stem = new T.CylinderGeometry(0.07, 0.22, 1, 9);
  stem.translate(0, 0.5, 0);
  parts.push(stem);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399,
      base = 0.26 + i * 0.052,
      len = 0.24 + (i % 3) * 0.075,
      end = new T.Vector3(Math.sin(a) * len, base + 0.32, Math.cos(a) * len),
      start = new T.Vector3(0, base, 0),
      v = end.clone().sub(start),
      g = new T.CylinderGeometry(0.01, 0.045, v.length(), 6);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.clone().normalize(),
      ),
    );
    g.translate(...start.add(end).multiplyScalar(0.5).toArray());
    parts.push(g);
  }
  const g = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return g;
}
function cards(material, transforms) {
  const mesh = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      material,
      transforms.length,
    ),
    o = new T.Object3D();
  transforms.forEach((p, i) => {
    o.position.set(p.x, p.y, p.z);
    o.rotation.set(p.rx, p.ry, p.rz);
    o.scale.set(p.w, p.h, 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(
      i,
      new T.Color().setHSL(
        0.25 + random() * 0.07,
        0.13,
        0.63 + random() * 0.16,
      ),
    );
  });
  mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}
export function detailedVegetation(scene, ground, models, m) {
  const sectors = new Map();
  let count = 0;
  const excluded = (x, z) =>
    ground.patches?.some((p) => inside(x, z, p.points));
  function tree(x, z, h, w, type) {
    const key = Math.floor(x / 150) + "," + Math.floor(z / 150);
    if (!sectors.has(key))
      sectors.set(key, { x, z, trunks: [], broad: [], pine: [] });
    const s = sectors.get(key),
      y = ground.height(x, z);
    s.trunks.push({
      x,
      y,
      z,
      sx: w * 0.5,
      sy: h * 0.83,
      sz: w * 0.5,
      ry: random() * 6.28,
    });
    const target = type === "pine" ? s.pine : s.broad,
      n = type === "willow" ? 48 : 36;
    for (let k = 0; k < n; k++) {
      const a = k * 2.399,
        r = w * 0.7 * Math.sqrt(random()),
        level = random();
      target.push({
        x: x + Math.cos(a) * r,
        y: y + h * (0.48 + level * 0.38),
        z: z + Math.sin(a) * r,
        w: type === "willow" ? 3.3 : 4.8,
        h: type === "willow" ? 5 : 4.2,
        rx: (random() - 0.5) * 1.6,
        ry: random() * 6.28,
        rz: (random() - 0.5) * 1.3,
      });
    }
    count++;
  }
  for (let z = -1250; z < 1120; z += 13)
    for (let x = -1750; x < 360; x += 13) {
      const xx = x + (random() - 0.5) * 11,
        zz = z + (random() - 0.5) * 11;
      if (
        !inside(xx, zz, ground.data.boundary) ||
        ground.waterAt(xx, zz) ||
        ground.platformAt(xx, zz) ||
        excluded(xx, zz)
      )
        continue;
      let near = 1e6;
      for (const s of ground.get(ground.pathGrid, xx, zz))
        near = Math.min(near, distanceToSegment(xx, zz, s.a, s.b) - s.w / 2);
      if (
        near < 3 ||
        models.some(
          (b) => Math.hypot(xx - b.x, zz - b.z) < Math.hypot(b.w, b.d) / 2 + 3,
        )
      )
        continue;
      const hill = zz < -755 && zz > -1135 && xx < 155 && xx > -820;
      if (random() > (hill ? 0.96 : 0.55)) continue;
      tree(
        xx,
        zz,
        7 + random() * 9,
        3.3 + random() * 2.7,
        hill && random() < 0.55 ? "pine" : "broad",
      );
    }
  for (const p of ground.data.paths.filter(
    (p) => p.name === "东堤" || p.name === "西堤",
  ))
    for (let i = 1; i < p.points.length; i++) {
      const a = p.points[i - 1],
        b = p.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      for (let at = 8; at < len; at += 27) {
        const x = a[0] + (dx * at) / len + (dz / len) * 5.7,
          z = a[1] + (dz * at) / len - (dx / len) * 5.7;
        if (!ground.waterAt(x, z) && inside(x, z, ground.data.boundary))
          tree(x, z, 7.5 + random() * 3, 3.8, "willow");
      }
    }
  const branch = branches(),
    broad = atlas(),
    pine = atlas(true),
    groups = [];
  for (const s of sectors.values()) {
    const g = new T.Group();
    g.add(instances(branch, m.trunk, s.trunks));
    if (s.broad.length) g.add(cards(broad, s.broad));
    if (s.pine.length) g.add(cards(pine, s.pine));
    g.userData = { x: s.x, z: s.z };
    scene.add(g);
    groups.push(g);
  }
  return {
    count,
    groups,
    update(camera, q) {
      const cut = q === "low" ? 1800 : 3000;
      for (const g of groups) {
        g.visible =
          Math.hypot(
            camera.position.x - g.userData.x,
            camera.position.z - g.userData.z,
          ) < cut;
        const near =
          Math.hypot(
            camera.position.x - g.userData.x,
            camera.position.z - g.userData.z,
          ) < (q === "high" ? 140 : 70);
        for (const mesh of g.children) mesh.castShadow = q !== "low" && near;
      }
    },
  };
}
