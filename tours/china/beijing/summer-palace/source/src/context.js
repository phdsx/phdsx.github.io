import * as T from "three";
import { inside } from "./geometry.js";
export function contextTerrain(scene, data, dem, ground, m) {
  const g = new T.PlaneGeometry(
    (dem.nx - 1) * dem.step,
    (dem.nz - 1) * dem.step,
    dem.nx - 1,
    dem.nz - 1,
  );
  g.rotateX(-Math.PI / 2);
  g.translate(
    dem.x0 + ((dem.nx - 1) * dem.step) / 2,
    0,
    dem.z0 + ((dem.nz - 1) * dem.step) / 2,
  );
  const p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, Math.max(-5, dem.heights[i]) - 1);
    uv.setXY(i, p.getX(i), p.getZ(i));
  }
  const idx = g.index.array,
    keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    const ids = [idx[i], idx[i + 1], idx[i + 2]],
      x = ids.reduce((s, j) => s + p.getX(j), 0) / 3,
      z = ids.reduce((s, j) => s + p.getZ(j), 0) / 3;
    if (!inside(x, z, data.boundary)) keep.push(...ids);
  }
  g.setIndex(keep);
  g.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ color: "#8a947e", roughness: 1 });
  const mesh = new T.Mesh(g, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  // Distant city context is deliberately muted; buildings outside the heritage site are not reconstructed.
  // Stitch the coarse context to the 12m garden edge, avoiding open sky triangles.
  if (ground) {
    const pos = [],
      uv = [];
    for (let i = 1; i < data.boundary.length; i++) {
      const a = data.boundary[i - 1],
        b = data.boundary[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (!len) continue;
      let nx = -dz / len,
        nz = dx / len;
      if (
        inside(
          (a[0] + b[0]) / 2 + nx * 10,
          (a[1] + b[1]) / 2 + nz * 10,
          data.boundary,
        )
      ) {
        nx = -nx;
        nz = -nz;
      }
      const vertices = [
        a,
        b,
        [b[0] + nx * 105, b[1] + nz * 105],
        [a[0] + nx * 105, a[1] + nz * 105],
      ];
      for (const j of [0, 2, 1, 0, 3, 2]) {
        const p = vertices[j],
          ix = T.MathUtils.clamp(
            Math.round((p[0] - dem.x0) / dem.step),
            0,
            dem.nx - 1,
          ),
          iz = T.MathUtils.clamp(
            Math.round((p[1] - dem.z0) / dem.step),
            0,
            dem.nz - 1,
          ),
          y =
            j < 2
              ? ground.natural(...p) - 0.12
              : Math.max(-5, dem.heights[iz * dem.nx + ix]) - 1;
        pos.push(p[0], y, p[1]);
        uv.push(...p);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const ring = new T.Mesh(g, m.earth);
    ring.receiveShadow = true;
    scene.add(ring);
  }
  return mesh;
}
