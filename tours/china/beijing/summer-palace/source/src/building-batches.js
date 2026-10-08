import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Per-building visibility inside material batches preserves LOD and picking,
// while the full-garden view no longer submits hundreds of small hall meshes.
export function batchCoarseBuildings(scene, groups) {
  const byMaterial = new Map(),
    matrix = new T.Matrix4();
  for (const item of groups) {
    if (item.b.id === "foxiang") continue;
    const g = item.coarse;
    g.updateMatrixWorld(true);
    const parts = new Map();
    g.traverse((o) => {
      if (!o.geometry) return;
      const a = parts.get(o.material) || [];
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, matrix);
          matrix.premultiply(o.matrixWorld);
          const geo = o.geometry.clone();
          geo.applyMatrix4(matrix);
          a.push(geo.index ? geo.toNonIndexed() : geo);
          if (geo.index) geo.dispose();
        }
      } else {
        const geo = o.geometry.clone();
        geo.applyMatrix4(o.matrixWorld);
        a.push(geo.index ? geo.toNonIndexed() : geo);
        if (geo.index) geo.dispose();
      }
      parts.set(o.material, a);
    });
    item.batchInstances = [];
    for (const [mat, a] of parts) {
      const geo = mergeGeometries(a, false);
      a.forEach((g) => g.dispose());
      if (!byMaterial.has(mat)) byMaterial.set(mat, []);
      byMaterial.get(mat).push({ geo, item });
    }
    scene.remove(g);
    g.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      o.geometry?.dispose();
    });
  }
  const meshes = [];
  for (const [material, entries] of byMaterial) {
    const vertices = entries.reduce(
        (s, e) => s + e.geo.attributes.position.count,
        0,
      ),
      mesh = new T.BatchedMesh(entries.length, vertices + 8, 0, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.models = {};
    for (const { geo, item } of entries) {
      const geometryId = mesh.addGeometry(geo),
        instanceId = mesh.addInstance(geometryId);
      mesh.setMatrixAt(instanceId, new T.Matrix4());
      mesh.userData.models[instanceId] = item.b;
      item.batchInstances.push({ mesh, instanceId });
      geo.dispose();
    }
    scene.add(mesh);
    meshes.push(mesh);
  }
  return {
    meshes,
    setVisible(item, visible) {
      for (const { mesh, instanceId } of item.batchInstances)
        mesh.setVisibleAt(instanceId, visible);
    },
  };
}
