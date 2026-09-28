export const SAND_RADIUS = 0.535;
export const SAND_FLOOR = 0.17;
export const SAND_UNIT_HEIGHT = 0.48;

export function random01(seed) {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function getVisibleLayers(tube, removeUnits = 0, addColor = null, addUnits = 0) {
  const layers = tube.map(color => ({ color, units: 1 }));
  let remaining = Math.max(0, removeUnits);
  while (remaining > 0 && layers.length) {
    const top = layers.at(-1);
    const removed = Math.min(top.units, remaining);
    top.units -= removed;
    remaining -= removed;
    if (top.units < 0.00001) layers.pop();
  }
  if (addColor && addUnits > 0) layers.push({ color: addColor, units: addUnits });
  return layers.reduce((merged, layer) => {
    if (merged.at(-1)?.color === layer.color) merged.at(-1).units += layer.units;
    else merged.push({ ...layer });
    return merged;
  }, []);
}

const DISK_SAMPLES = Array.from({ length: 512 }, (_, i) => {
  const radius = SAND_RADIUS * Math.sqrt((i + 0.5) / 512);
  const angle = i * 2.399963229728653;
  return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
});

// Find the vertical offset that preserves volume after gravity tilts the free
// surface. Equal-area disk samples account for the portions clipped by the base.
export function createSandSurface(meanHeight, { tilt = 0, mound = 0, seed = 0, ceiling = 2.17, lowerSurface = null } = {}) {
  const mean = Math.max(SAND_FLOOR, Math.min(ceiling, meanHeight));
  const slope = Math.max(-3.6, Math.min(3.6, -Math.tan(tilt)));
  const shape = (x, z) => slope * x
    + mound * Math.max(0, 1 - Math.hypot(x - 0.035, z) / SAND_RADIUS)
    + 0.009 * (Math.sin(x * 12 + seed) + Math.sin(z * 17 + seed * 0.7));
  const clip = (value, floor = SAND_FLOOR) => Math.max(floor, Math.min(ceiling, value));
  const sampleOffsets = DISK_SAMPLES.map(p => shape(p.x, p.z));
  const sampleFloors = DISK_SAMPLES.map(p => lowerSurface ? lowerSurface.height(p.x, p.z) : SAND_FLOOR);
  let low = SAND_FLOOR - 4, high = ceiling + 4;
  for (let step = 0; step < 26; step++) {
    const mid = (low + high) / 2;
    const average = sampleOffsets.reduce((sum, offset, index) => sum + clip(mid + offset,sampleFloors[index]), 0) / sampleOffsets.length;
    if (average < mean) low = mid;
    else high = mid;
  }
  const offset = (low + high) / 2;
  return { height: (x, z) => clip(offset + shape(x, z),lowerSurface ? lowerSurface.height(x,z) : SAND_FLOOR), meanHeight: mean };
}

export function sampleSurfaceMean(surface) {
  return DISK_SAMPLES.reduce((sum, p) => sum + surface.height(p.x, p.z), 0) / DISK_SAMPLES.length;
}

// Semi-implicit Euler with small substeps, gravity and a dissipative contact.
// The particles are visual grains; the height field retains the puzzle's volume.
export function stepGrain(grain, dt, collider) {
  let remaining = Math.min(0.1, Math.max(0, dt));
  while (remaining > 0) {
    const step = Math.min(1 / 120, remaining);
    grain.vy -= (collider?.gravity ?? 9.81) * step;
    grain.x += grain.vx * step;
    grain.y += grain.vy * step;
    grain.z += grain.vz * step;
    if (collider) {
      const dx = grain.x - collider.x, dz = grain.z - collider.z;
      const radius = Math.hypot(dx, dz);
      if (radius < collider.radius) {
        const surface = collider.height(dx, dz);
        if (grain.y < surface && grain.vy < 0) {
          grain.y = surface;
          grain.vy *= -0.13;
          grain.vx *= 0.52;
          grain.vz *= 0.52;
          grain.contacts = (grain.contacts || 0) + 1;
        }
      }
    }
    grain.age += step;
    remaining -= step;
  }
  return grain;
}
