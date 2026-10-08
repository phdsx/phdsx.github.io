import { inside, distance, segmentPoint } from "./geo.js";
export function createNavigation(data) {
  const segments = [];
  const grid = new Map();
  const size = 20;
  for (const path of data.paths)
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1],
        b = path.points[i],
        s = { a, b, width: path.width, bridge: path.bridge, id: path.id };
      segments.push(s);
      const margin = s.width;
      for (
        let x = Math.floor((Math.min(a[0], b[0]) - margin) / size);
        x <= Math.floor((Math.max(a[0], b[0]) + margin) / size);
        x++
      )
        for (
          let z = Math.floor((Math.min(a[1], b[1]) - margin) / size);
          z <= Math.floor((Math.max(a[1], b[1]) + margin) / size);
          z++
        ) {
          const k = x + "," + z;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(s);
        }
    }
  const blockers = [
    ...data.buildings,
    ...data.enclosures,
    ...(data.barriers || []),
  ];
  function blocked(p, r = 0.35) {
    return blockers.some(
      (b) =>
        inside(p, b.points) ||
        b.points.some(
          (a, i) => i && distance(p, segmentPoint(p, b.points[i - 1], a)) < r,
        ),
    );
  }
  function ground(p, r = 0.35) {
    if (!inside(p, data.boundary) || blocked(p, r)) return null;
    const local =
      grid.get(Math.floor(p[0] / size) + "," + Math.floor(p[1] / size)) || [];
    const s = local.find(
      (s) => distance(p, segmentPoint(p, s.a, s.b)) < s.width / 2 - r,
    );
    const inPlaza = (data.plazas || []).some((a) => inside(p, a.points));
    if (!s && !inPlaza) return null;
    if (!s?.bridge && data.water.some((w) => inside(p, w.points))) return null;
    return 0.12;
  }
  function spawn(target) {
    const options = segments
      .map((s) => ({ p: segmentPoint(target, s.a, s.b), s }))
      .sort((a, b) => distance(target, a.p) - distance(target, b.p));
    for (const { p, s } of options) {
      if (ground(p) !== null)
        return {
          position: p,
          height: ground(p),
          distance: distance(target, p),
          pathId: s.id,
        };
      for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
        const q = [
          s.a[0] + (s.b[0] - s.a[0]) * t,
          s.a[1] + (s.b[1] - s.a[1]) * t,
        ];
        if (ground(q) !== null)
          return {
            position: q,
            height: ground(q),
            distance: distance(target, q),
            pathId: s.id,
          };
      }
    }
    throw Error("没有找到安全游客道路");
  }
  function move(p, dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25));
    let q = [...p];
    for (let i = 0; i < steps; i++) {
      let next = [q[0] + dx / steps, q[1] + dz / steps];
      if (ground(next) !== null) q = next;
      else {
        next = [q[0] + dx / steps, q[1]];
        if (ground(next) !== null) q = next;
        next = [q[0], q[1] + dz / steps];
        if (ground(next) !== null) q = next;
      }
    }
    return q;
  }
  return { ground, spawn, move, segments, blocked };
}
