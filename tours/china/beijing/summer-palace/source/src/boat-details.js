import * as T from "three";
export function boatCarving(batch, m) {
  // Prow side plates rise into carved scrolls, distinct from a floating boat hull.
  for (const side of [-1, 1]) {
    const s = new T.Shape();
    s.moveTo(-18, 0.25);
    s.lineTo(-18, 4.6);
    s.bezierCurveTo(-18, 5.2, -15.8, 5.3, -15.2, 4.3);
    s.bezierCurveTo(-14.2, 2.4, -11, 1.9, -6.8, 1.7);
    s.lineTo(-6.8, 0.25);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 2,
    });
    g.rotateY(Math.PI / 2);
    batch.add(g, "boat", side * 4.3, 0, 0);
    const points = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 4,
        r = 0.72 * (1 - i / 100);
      points.push(
        new T.Vector3(
          side * 4.56,
          4.38 + r * Math.sin(a),
          16.22 + r * Math.cos(a),
        ),
      );
    }
    batch.add(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 90, 0.075, 7, false),
      "stone",
    );
    for (let level = 0; level < 2; level++) {
      const y = 1.8 + level * 3.7;
      for (let z = -12; z <= 12; z += 0.45) {
        batch.box(0.08, 0.77, 0.08, side * 3.6, y + 0.42, z, "boat");
        const bead = new T.SphereGeometry(0.09, 7, 5);
        batch.add(bead, "boat", side * 3.6, y + 0.52, z);
      }
      batch.box(0.22, 0.15, 25, side * 3.6, y + 0.89, 0, "boat");
      for (let i = 0; i < 8; i++) {
        const z = -12 + i * 3.1;
        batch.box(0.57, 0.14, 0.57, side * 3.6, y + 2.82, z, "boat");
        batch.box(0.48, 0.16, 0.48, side * 3.6, y + 0.08, z, "boat");
      }
    }
  }
  // Roof balustrade and triangular pediments of the western-style cabin.
  for (const side of [-1, 1]) {
    for (let z = -13; z < 12; z += 0.7)
      batch.box(0.13, 0.65, 0.13, side * 4, 10.08, z, "boat");
    batch.box(0.24, 0.18, 26, side * 4, 10.47, -1, "boat");
  }
  for (const z of [-13.6, 11.6]) {
    const s = new T.Shape();
    s.moveTo(-3.3, 0);
    s.lineTo(0, 1.55);
    s.lineTo(3.3, 0);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: false });
    batch.add(g, "boat", 0, 9.84, z);
    const inner = new T.Shape();
    inner.moveTo(-2.4, 0.17);
    inner.lineTo(0, 1.26);
    inner.lineTo(2.4, 0.17);
    inner.closePath();
    const q = new T.ShapeGeometry(inner);
    batch.add(q, "stone", 0, 9.84, z + 0.34);
  }
  // Open arch frame on the end elevation.
  for (const level of [0, 1]) {
    const y = 1.8 + level * 3.7,
      z = 11.35;
    for (const x of [-3.6, 0, 3.6]) {
      const col = new T.CylinderGeometry(0.19, 0.22, 2.9, 12);
      batch.add(col, "boat", x, y + 1.45, z);
    }
    for (const x of [-1.8, 1.8]) {
      const c = new T.EllipseCurve(0, 0, 1.65, 0.72, 0, Math.PI, false, 0),
        pts = c
          .getPoints(20)
          .map((p) => new T.Vector3(x + p.x, y + 2.15 + p.y, z));
      batch.add(
        new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.14, 7, false),
        "boat",
      );
    }
  }
}
