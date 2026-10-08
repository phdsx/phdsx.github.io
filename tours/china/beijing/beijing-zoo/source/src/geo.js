// WGS84 local tangent approximation, accurate to centimetres over this 1.3 km site.
export const ORIGIN = [116.332, 39.938];
export const R = 6378137;
export function local(lon, lat) {
  return [
    (((lon - ORIGIN[0]) * Math.PI) / 180) *
      R *
      Math.cos((ORIGIN[1] * Math.PI) / 180),
    ((-(lat - ORIGIN[1]) * Math.PI) / 180) * R,
  ];
}
export function geographic(x, z) {
  return [
    ORIGIN[0] +
      ((x / (R * Math.cos((ORIGIN[1] * Math.PI) / 180))) * 180) / Math.PI,
    ORIGIN[1] - ((z / R) * 180) / Math.PI,
  ];
}
export function inside(p, poly) {
  let on = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      on = !on;
  }
  return on;
}
export function segmentPoint(p, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return [a[0] + dx * t, a[1] + dz * t];
}
export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
export function centroid(p) {
  return p
    .slice(0, -1)
    .reduce(
      (a, c) => [a[0] + c[0] / (p.length - 1), a[1] + c[1] / (p.length - 1)],
      [0, 0],
    );
}
export function bounds(ps) {
  return ps.reduce(
    (a, p) => [
      Math.min(a[0], p[0]),
      Math.min(a[1], p[1]),
      Math.max(a[2], p[0]),
      Math.max(a[3], p[1]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}
