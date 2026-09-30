import * as T from "three";
import { Batch, polygon, instances, inside, roofGeometry } from "./geometry.js";
import { random } from "./materials.js";
import { pathStrip } from "./landscape.js";
export function prepareCourts(ground) {
  const courts = [
    ["排云殿前庭", [-465, -383, -787, -750]],
    ["排云殿上庭", [-461, -379, -832, -787]],
    ["仁寿殿前庭", [103, 182, -772, -689]],
    ["乐寿堂院落", [-86, -5, -861, -774]],
    ["玉澜堂院落", [-8, 56, -765, -697]],
    ["德和园院落", [37, 91, -855, -770]],
    ["南湖岛前院", [-290, -207, -32, 23]],
  ];
  for (const [name, [x0, x1, z0, z1]] of courts) {
    const x = (x0 + x1) / 2,
      z = (z0 + z1) / 2,
      y = ground.natural(x, z);
    ground.patches.push({
      name,
      x,
      z,
      y,
      points: [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ],
      confidence:
        "photo/map inferred courtyard boundary; DEM-derived terrace level",
    });
  }
}
export function detailLandscape(scene, ground, models, m) {
  const batch = new Batch(m),
    stairs = [];
  for (const p of ground.patches) {
    const geo = polygon(p.points, [], 0.06);
    const uv = geo.attributes.uv,
      pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
    const mesh = new T.Mesh(geo, m.pave);
    mesh.position.y = p.y + 0.04;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  function staircase(a, b, width, y0, y1, name) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      steps = Math.max(1, Math.ceil(Math.abs(y1 - y0) / 0.17)),
      yaw = -Math.atan2(dz, dx);
    const g = new T.Group();
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps,
        hh = T.MathUtils.lerp(y0, y1, (i + 1) / steps);
      batch.box(
        len / steps + 0.03,
        0.2,
        width,
        a[0] + dx * t,
        hh - 0.1,
        a[1] + dz * t,
        "stone",
        yaw,
      );
    }
    ground.ramps.push({ a, b, width, y0, y1, name });
    stairs.push({ a, b, width, y0, y1, name });
  }
  for (const p of ground.data.paths.filter((p) => p.steps && !p.bridge))
    for (let i = 1; i < p.points.length; i++) {
      const a = p.points[i - 1],
        b = p.points[i],
        y0 = ground.height(...a),
        y1 = ground.height(...b);
      if (Math.abs(y0 - y1) > 0.25)
        staircase(a, b, Math.max(2.2, p.width), y0, y1, p.name || "山径踏步");
    }
  const tower = models.find((b) => b.id === "foxiang");
  for (const side of [-1, 1]) {
    const a = [tower.x + side * 27, tower.z + 37],
      b = [tower.x + side * 22, tower.z + 4],
      y0 = ground.natural(...a),
      y1 = tower.base;
    staircase(a, b, 4.2, y0, y1, "佛香阁侧阶");
    const landing = [b, [tower.x + side * 17, tower.z + 4]];
    ground.ramps.push({
      a: landing[0],
      b: landing[1],
      width: 4.2,
      y0: y1,
      y1,
      name: "佛香阁平台连接",
    });
    pathStrip(landing, 4.2, ground, m.pave, scene);
  }
  // Plinth access flights follow each hall's local front. Foundation masses seal terrace gaps.
  for (const b of models.filter(
    (b) => b.name && !b.gate && !b.pavilion && b.id !== "foxiang" && b.w < 70,
  )) {
    const co = Math.cos(b.yaw),
      si = Math.sin(b.yaw),
      front = [
        b.x + Math.sin(b.yaw) * b.d * 0.5,
        b.z + Math.cos(b.yaw) * b.d * 0.5,
      ],
      a = [front[0] + si * 5, front[1] + co * 5],
      y0 = ground.terrainHeight(...a);
    const rise = b.base - y0;
    if (rise > 0.24 && rise < 8) {
      staircase(a, front, Math.min(7, b.w * 0.35), y0, b.base, b.name + "踏步");
      batch.box(
        b.w,
        rise + 0.3,
        b.d,
        b.x,
        b.base - (rise + 0.3) / 2,
        b.z,
        "stone",
        b.yaw,
      );
    }
  }
  // Lakeside retaining faces are vertical stonework, not a thin strip floating above the lake.
  for (const w of ground.waterAreas)
    for (const ring of [w.points, ...w.holes])
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1],
          b = ring[i],
          len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 0.2)
          batch.box(
            len,
            1.35,
            0.55,
            (a[0] + b[0]) / 2,
            0.55,
            (a[1] + b[1]) / 2,
            "stone",
            -Math.atan2(b[1] - a[1], b[0] - a[0]),
          );
      }
  // Small garden rocks, rounded shrubs and seating are inferred furnishings, not inventoried assets.
  const rocks = [],
    shrubs = [];
  for (const garden of ground.data.gardens)
    for (let i = 0; i < 80; i++) {
      const x = 190 + random() * 119,
        z = -1090 + random() * 150;
      if (
        !inside(x, z, garden.points) ||
        ground.waterAt(x, z) ||
        ground.platformAt(x, z)
      )
        continue;
      const y = ground.height(x, z);
      (i % 4 === 0 ? rocks : shrubs).push({
        x,
        y: y + 0.45,
        z,
        sx: 0.6 + random() * 1.4,
        sy: 0.6 + random() * 0.6,
        sz: 0.8 + random() * 1.3,
        ry: random() * 6.28,
      });
    }
  if (rocks.length)
    scene.add(instances(new T.IcosahedronGeometry(1, 2), m.rock, rocks));
  if (shrubs.length)
    scene.add(instances(new T.SphereGeometry(1, 12, 8), m.pine, shrubs));
  for (const p of ground.data.paths.filter(
    (p) => p.name === "东堤" || p.name === "西堤",
  ))
    for (let i = 1; i < p.points.length; i++) {
      const a = p.points[i - 1],
        b = p.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      for (let t = 14; t < len; t += 65) {
        const x = a[0] + (dx * t) / len - (dz / len) * 4.5,
          z = a[1] + (dz * t) / len + (dx / len) * 4.5;
        if (ground.waterAt(x, z)) continue;
        const y = ground.height(x, z),
          yaw = -Math.atan2(dz, dx);
        for (let j = 0; j < 5; j++)
          batch.box(
            2,
            0.065,
            0.1,
            x,
            y + 0.47,
            z + (j - 2) * 0.13,
            "wood",
            yaw,
          );
        batch.box(0.15, 0.43, 0.6, x - 0.65, y + 0.215, z, "stone", yaw);
        batch.box(0.15, 0.43, 0.6, x + 0.65, y + 0.215, z, "stone", yaw);
      }
    }
  const g = batch.finish();
  scene.add(g);
  return { group: g, stairs };
}
