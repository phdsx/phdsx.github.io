/* Reconstruct monochrome artwork as resolution-independent closed paths.
 * Every original pixel centre must retain its original coverage, at every shade.
 * No bitmap interpolation, guessed map coordinates, or replacement game data. */
(() => {
  'use strict';
  function inkAt(rgba, p) { return Math.round((255 - rgba[p]) * rgba[p + 3] / 255); }
  function bounds(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  function collinear(points) {
    return points.filter((b, i) => {
      const a = points[(i + points.length - 1) % points.length], c = points[(i + 1) % points.length];
      return (b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0]);
    });
  }
  function distance2(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
    return (p[0] - a[0] - dx * t) ** 2 + (p[1] - a[1] - dy * t) ** 2;
  }
  function simplifyOpen(points, tolerance) {
    const keep = new Uint8Array(points.length), stack = [[0, points.length - 1]];
    keep[0] = keep[points.length - 1] = 1;
    while (stack.length) {
      const [a, b] = stack.pop(); let furthest = -1, max = tolerance * tolerance;
      for (let i = a + 1; i < b; i++) {
        const d = distance2(points[i], points[a], points[b]);
        if (d > max) { max = d; furthest = i; }
      }
      if (furthest !== -1) { keep[furthest] = 1; stack.push([a, furthest], [furthest, b]); }
    }
    return points.filter((_, i) => keep[i]);
  }
  function simplifyClosed(points, tolerance) {
    let split = 1, farthest = 0;
    for (let i = 1; i < points.length; i++) {
      const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
      if (d > farthest) { farthest = d; split = i; }
    }
    return [...simplifyOpen(points.slice(0, split + 1), tolerance).slice(0, -1),
      ...simplifyOpen([...points.slice(split), points[0]], tolerance).slice(0, -1)];
  }
  function scanline(points, y) {
    const hits = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] > y) !== (b[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    return spansForHits(hits);
  }
  function spansForHits(hits) {
    hits.sort((a, b) => a - b);
    const spans = [];
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const left = Math.ceil(hits[i] - .5 - 1e-9), right = Math.ceil(hits[i + 1] - .5 - 1e-9);
      if (left < right) {
        if (spans.length && spans[spans.length - 1] === left) spans[spans.length - 1] = right;
        else spans.push(left, right);
      }
    }
    return spans.join(',');
  }
  function roundedPath(points) {
    const box = bounds(points);
    const corners = points.map((b, i) => {
      const a=points[(i+points.length-1)%points.length], c=points[(i+1)%points.length];
      const before=Math.hypot(a[0]-b[0],a[1]-b[1]), after=Math.hypot(c[0]-b[0],c[1]-b[1]);
      // Keep isolated extrema fixed, including peak tips and the ends of rivers.
      const anchor = [0,1].some(axis => (b[axis]===box[axis]||b[axis]===box[axis+2]) && points.filter(p=>p[axis]===b[axis]).length===1);
      const radius = anchor ? 0 : Math.min(.65,before*.48,after*.48);
      return {start:[b[0]+(a[0]-b[0])*radius/before,b[1]+(a[1]-b[1])*radius/before],control:b,
        end:[b[0]+(c[0]-b[0])*radius/after,b[1]+(c[1]-b[1])*radius/after]};
    });
    return corners;
  }
  function curveScanline(corners, y) {
    const hits=[];
    for(let i=0;i<corners.length;i++) {
      const {start:a,control:b,end:c}=corners[i], next=corners[(i+1)%corners.length].start;
      if((c[1]>y)!==(next[1]>y))hits.push(c[0]+(y-c[1])*(next[0]-c[0])/(next[1]-c[1]));
      const qa=a[1]-2*b[1]+c[1], qb=2*(b[1]-a[1]), qc=a[1]-y;
      const roots=[];
      if(Math.abs(qa)<1e-10){if(Math.abs(qb)>1e-10)roots.push(-qc/qb);}
      else {const disc=qb*qb-4*qa*qc;if(disc>=0){const d=Math.sqrt(disc);roots.push((-qb-d)/(2*qa),(-qb+d)/(2*qa));}}
      const cuts=[0,1],turn=-qb/(2*qa);
      if(turn>0&&turn<1)cuts.splice(1,0,turn);
      const value=t=>qa*t*t+qb*t+a[1];
      for(let j=0;j<cuts.length-1;j++){
        const left=cuts[j],right=cuts[j+1];
        if((value(left)>y)===(value(right)>y))continue;
        const t=roots.find(t=>t>=left-1e-9&&t<=right+1e-9);
        if(t===undefined)continue;
        hits.push((1-t)*(1-t)*a[0]+2*(1-t)*t*b[0]+t*t*c[0]);
      }
    }
    return spansForHits(hits);
  }
  function verifiedCurve(points) {
    const curve=roundedPath(points),box=bounds(points);
    for(let y=box[1];y<box[3];y++)if(scanline(points,y+.5)!==curveScanline(curve,y+.5))return null;
    return curve;
  }
  function sameCoverage(a, b) {
    if (b.length < 3) return false;
    const box = bounds(a);
    if (box.join(',') !== bounds(b).join(',')) return false;
    for (let y = box[1]; y < box[3]; y++) if (scanline(a, y + .5) !== scanline(b, y + .5)) return false;
    return true;
  }
  function samePatch(a, b) {
    // Both open chains share their endpoints. Closing each with the same chord
    // isolates the changed strip, so a complex face/map can be refined locally.
    const low = Math.min(...a.map(p => p[1]), ...b.map(p => p[1]));
    const high = Math.max(...a.map(p => p[1]), ...b.map(p => p[1]));
    for (let y = low; y < high; y++) if (scanline(a, y + .5) !== scanline(b, y + .5)) return false;
    return true;
  }
  function simplifyPatches(points, tolerance) {
    const ring = [...points, points[0]], result = [];
    for (let i = 0; i < points.length; i += 12) {
      const patch = ring.slice(i, Math.min(i + 13, ring.length));
      const candidate = simplifyOpen(patch, tolerance);
      result.push(...(samePatch(patch, candidate) ? candidate : patch).slice(0, -1));
    }
    return result;
  }
  function trace(values, width, height, shade) {
    const stride = width + 1, edges = [], outgoing = new Map();
    function add(x1, y1, x2, y2, direction) {
      const e = { from: y1 * stride + x1, to: y2 * stride + x2, direction, used: false };
      edges.push(e);
      if (!outgoing.has(e.from)) outgoing.set(e.from, []);
      outgoing.get(e.from).push(e);
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (values[p] !== shade) continue;
      if (!y || values[p - width] !== shade) add(x, y, x + 1, y, 0);
      if (x === width - 1 || values[p + 1] !== shade) add(x + 1, y, x + 1, y + 1, 1);
      if (y === height - 1 || values[p + width] !== shade) add(x + 1, y + 1, x, y + 1, 2);
      if (!x || values[p - 1] !== shade) add(x, y + 1, x, y, 3);
    }
    const rings = [];
    for (const start of edges) {
      if (start.used) continue;
      const points = []; let e = start;
      do {
        e.used = true; points.push([e.from % stride, Math.floor(e.from / stride)]);
        if (e.to === start.from) break;
        const next = outgoing.get(e.to).filter(edge => !edge.used);
        const rank = edge => [1, 0, 3, 2][(edge.direction - e.direction + 4) % 4];
        next.sort((a, b) => rank(a) - rank(b)); e = next[0];
      } while (e);
      if (!e) throw Error('Artwork contour did not close');
      rings.push(collinear(points));
    }
    return rings;
  }
  function reconstruct(rgba, width, height) {
    const values = new Uint8Array(width * height), shades = new Set();
    for (let i = 0; i < values.length; i++) { values[i] = inkAt(rgba, i * 4); if (values[i]) shades.add(values[i]); }
    const layers = []; let sourcePoints = 0, vectorPoints = 0, refined = 0, curved = 0;
    for (const shade of shades) {
      const paths = trace(values, width, height, shade).map(original => {
        let result = original;
        // Hard bounds and source-pixel coverage are invariants, not a visual guess.
        const candidates = [simplifyClosed(original, .74), simplifyClosed(original, .55), simplifyPatches(original, .9), simplifyPatches(original, .74)];
        for (const candidate of candidates) if (candidate.length < result.length && sameCoverage(original, candidate)) result = candidate;
        if (result !== original) refined++;
        sourcePoints += original.length; vectorPoints += result.length;
        return result;
      });
      const curves=paths.map(points=>{const curve=verifiedCurve(points);if(curve)curved++;return curve;});
      layers.push({ shade, paths, curves });
    }
    return { layers, sourcePoints, vectorPoints, refined, curved, width, height };
  }
  function paint(ctx, artwork, scale) {
    for (const layer of artwork.layers) {
      ctx.fillStyle = `rgba(0,0,0,${layer.shade / 255})`; ctx.beginPath();
      for (let n=0;n<layer.paths.length;n++) {
        const points=layer.paths[n],curve=layer.curves[n];
        if(curve){
          ctx.moveTo(curve[0].start[0]*scale,curve[0].start[1]*scale);
          for(let i=0;i<curve.length;i++){
            const corner=curve[i];
            if(i)ctx.lineTo(corner.start[0]*scale,corner.start[1]*scale);
            ctx.quadraticCurveTo(corner.control[0]*scale,corner.control[1]*scale,corner.end[0]*scale,corner.end[1]*scale);
          }
        }else{
          ctx.moveTo(points[0][0] * scale, points[0][1] * scale);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * scale, points[i][1] * scale);
        }
        ctx.closePath();
      }
      ctx.fill('evenodd');
    }
  }
  const api = { reconstruct, paint, trace, sameCoverage, scanline, curveScanline, inkAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BayeVectorArt = api;
})();
