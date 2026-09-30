// Metres, seconds and radians. Regulation size: IFAB Laws 1 & 2.
// Aerodynamics: quadratic relative-air drag and spin-dependent Magnus lift.
// https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/forces-on-a-soccer-ball/
export const FIELD = Object.freeze({
  startZ: 10, wallZ: 0.85, keeperZ: -12, goalZ: -13,
  goalHalfWidth: 3.66, goalHeight: 2.44, postRadius: 0.06,
  ballRadius: 0.11, wallCenters: [-0.93, -0.31, 0.31, 0.93]
});
export const PHYSICS = Object.freeze({ gravity: 9.81, mass: 0.43, airDensity: 1.225, step: 1 / 240 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const airFactor = 0.5 * PHYSICS.airDensity * Math.PI * FIELD.ballRadius ** 2 / PHYSICS.mass;

export function makeShot({ aim = 0, power = 82, side = 0, height = -1, wind = 0 } = {}) {
  power = clamp(power, 40, 100); side = clamp(side, -1, 1); height = clamp(height, -1, 1);
  const speed = (12 + power * 0.23) * (1 - Math.abs(side) * 0.035);
  const angle = clamp(aim, -18, 18) * Math.PI / 180;
  const elevation = (8.5 - height * 5.5) * Math.PI / 180;
  const horizontal = speed * Math.cos(elevation);
  const backspin = -height * 7;
  return {
    x: 0, y: FIELD.ballRadius, z: FIELD.startZ,
    vx: Math.sin(angle) * horizontal, vy: Math.sin(elevation) * speed, vz: -Math.cos(angle) * horizontal,
    spinX: Math.cos(angle) * backspin, spinY: side * 48, spinZ: Math.sin(angle) * backspin,
    speed, side, wind, time: 0, result: null, rolling: false, bounces: 0,
    wallHit: false, postHit: false, impact: null, impactCount: 0
  };
}

export function wallJump(time, index = 0) {
  const t = (time - 0.1 - index * 0.012) / 0.62;
  return t > 0 && t < 1 ? 0.32 * Math.sin(Math.PI * t) : 0;
}

// These capsules are also used to build the visible player, so hands, head,
// torso and legs block the ball only where they actually are.
export function playerParts(isKeeper = false, diving = false) {
  const parts = [
    { a: [0, 0.91, 0], b: [0, 1.35, 0], r: 0.23, kind: 'shirt' },
    { a: [0, 0.72, 0], b: [0, 0.86, 0], r: 0.23, kind: 'shorts' },
    { a: [0, 1.7, 0], b: [0, 1.7, 0], r: 0.16, kind: 'head' }
  ];
  for (const sign of [-1, 1]) {
    const elbow = isKeeper ? [sign * 0.48, diving ? 1.66 : 1.18, 0.05] : [sign * 0.33, 1.08, 0.08];
    const hand = isKeeper ? [sign * 0.75, diving ? 1.98 : 1.42, 0.12] : [sign * 0.14, 0.96, 0.18];
    parts.push(
      { a: [sign * 0.23, 1.38, 0], b: elbow, r: 0.08, kind: 'sleeve' },
      { a: elbow, b: hand, r: 0.065, kind: 'skin' },
      { a: hand, b: hand, r: isKeeper ? 0.105 : 0.075, kind: isKeeper ? 'glove' : 'skin' },
      { a: [sign * 0.15, 0.69, 0], b: [sign * 0.18, 0.4, 0.025], r: 0.095, kind: 'skin' },
      { a: [sign * 0.18, 0.4, 0.025], b: [sign * 0.19, 0.13, 0.04], r: 0.075, kind: 'sock' },
      { a: [sign * 0.19, 0.09, 0.015], b: [sign * 0.19, 0.09, 0.19], r: 0.075, kind: 'boot' }
    );
  }
  return parts;
}

export function makeKeeper() {
  return { x: 0, y: 0, lean: 0, time: 0, targetX: 0, targetY: 1, direction: 0, diveTime: null };
}

export function advanceKeeper(keeper, shot, dt) {
  keeper.time += dt;
  if (keeper.diveTime !== null) {
    keeper.diveTime += dt;
    const t = keeper.diveTime;
    if (t < 0.54) keeper.x = clamp(keeper.x + keeper.direction * 4.2 * dt, -3.05, 3.05);
    const reach = Math.sin(Math.PI * Math.min(t / 0.8, 1));
    keeper.lean = -keeper.direction * Math.min(1, t / 0.32) * 1.22;
    const flightY = reach * (0.24 + clamp(keeper.targetY - 1.1, -0.5, 1.2) * 0.28);
    const lowest = Math.min(...playerParts(true, true).flatMap(part => [part.a, part.b].map(p => 1 + p[0] * Math.sin(keeper.lean) + (p[1] - 1) * Math.cos(keeper.lean) - part.r)));
    const landing = clamp((t - 0.45) / 0.4, 0, 1);
    keeper.y = Math.max(-lowest, flightY * (1 - landing) - lowest * landing);
    return keeper;
  }
  if (shot.time < 0.23 || shot.vz >= 0 || shot.result) return keeper;
  const remaining = Math.max(0, (shot.z - FIELD.keeperZ) / -shot.vz);
  // Read the visible flight after a human reaction delay; a committed dive
  // cannot retarget itself to a late curve.
  keeper.targetX = clamp(shot.x + shot.vx * remaining, -3.25, 3.25);
  keeper.targetY = clamp(shot.y + shot.vy * remaining - 0.5 * PHYSICS.gravity * remaining ** 2, 0.15, 2.7);
  if (remaining < 0.58 && (Math.abs(keeper.targetX - keeper.x) > 0.55 || keeper.targetY > 1.85 || keeper.targetY < 0.55)) {
    keeper.direction = Math.sign(keeper.targetX - keeper.x) || 1;
    keeper.diveTime = 0;
  } else {
    keeper.x += clamp(keeper.targetX - keeper.x, -1.7 * dt, 1.7 * dt);
  }
  return keeper;
}

function acceleration(shot, vx, vy, vz) {
  const ux = vx - shot.wind, uy = vy, uz = vz;
  const speed = Math.hypot(ux, uy, uz);
  const cd = 0.23 + 0.18 / (1 + Math.exp((speed - 15) / 2));
  const drag = airFactor * cd * speed;
  const cx = shot.spinY * uz - shot.spinZ * uy;
  const cy = shot.spinZ * ux - shot.spinX * uz;
  const cz = shot.spinX * uy - shot.spinY * ux;
  const cross = Math.hypot(cx, cy, cz);
  const spinRatio = FIELD.ballRadius * cross / Math.max(speed * speed, 0.01);
  const lift = airFactor * speed * speed * Math.min(0.28, spinRatio * 0.9) / Math.max(cross, 0.01);
  return { x: -drag * ux + lift * cx, y: -PHYSICS.gravity - drag * uy + lift * cy, z: -drag * uz + lift * cz };
}

function integrate(shot, dt) {
  if (shot.rolling) {
    const speed = Math.hypot(shot.vx, shot.vz);
    const friction = Math.max(0, 1 - 1.1 * dt / Math.max(speed, 0.001));
    shot.vx *= friction; shot.vz *= friction; shot.vy = 0;
    shot.y = FIELD.ballRadius;
    shot.spinX = -shot.vz / FIELD.ballRadius; shot.spinZ = shot.vx / FIELD.ballRadius;
    shot.x += shot.vx * dt; shot.z += shot.vz * dt;
  } else {
    const a = acceleration(shot, shot.vx, shot.vy, shot.vz);
    const mx = shot.vx + a.x * dt / 2, my = shot.vy + a.y * dt / 2, mz = shot.vz + a.z * dt / 2;
    const mid = acceleration(shot, mx, my, mz);
    shot.x += mx * dt; shot.y += my * dt; shot.z += mz * dt;
    shot.vx += mid.x * dt; shot.vy += mid.y * dt; shot.vz += mid.z * dt;
  }
  const decay = Math.exp(-0.12 * dt);
  shot.spinX *= decay; shot.spinY *= decay; shot.spinZ *= decay;
  shot.time += dt;
}

function groundContact(shot) {
  if (shot.y > FIELD.ballRadius || shot.vy >= 0) return;
  shot.y = FIELD.ballRadius;
  shot.bounces++;
  shot.vy *= -0.52;
  shot.vx *= 0.82; shot.vz *= 0.82;
  if (shot.vy < 0.65) { shot.vy = 0; shot.rolling = true; }
  impact(shot, 'ground');
}

function impact(shot, type) {
  shot.impact = { type, x: shot.x, y: shot.y, z: shot.z, time: shot.time };
  shot.impactCount++;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((v, i) => v - b[i]);
function sphereHit(p, d, center, radius) {
  const offset = sub(p, center), aa = dot(d, d), bb = dot(offset, d), cc = dot(offset, offset) - radius * radius;
  if (aa < 1e-12) return null;
  const h = bb * bb - aa * cc;
  if (h < 0) return null;
  const t = cc <= 0 ? 0 : (-bb - Math.sqrt(h)) / aa;
  return t >= 0 && t <= 1 ? t : null;
}

// Swept ball/capsule intersection prevents fast shots tunnelling through a
// thin post or a glove between frames.
function capsuleHit(before, shot, a, b, radius, type) {
  radius += FIELD.ballRadius;
  const p = [before.x, before.y, before.z], d = [shot.x - before.x, shot.y - before.y, shot.z - before.z];
  const ba = sub(b, a), oa = sub(p, a), length = dot(ba, ba);
  let t = null;
  if (length > 1e-10) {
    const bd = dot(ba, d), bo = dot(ba, oa);
    const aa = length * dot(d, d) - bd * bd;
    const bb = length * dot(d, oa) - bo * bd;
    const cc = length * dot(oa, oa) - bo * bo - radius * radius * length;
    const h = bb * bb - aa * cc;
    const startProjection = clamp(bo / length, 0, 1);
    const startOffset = sub(p, a.map((v, i) => v + ba[i] * startProjection));
    if (dot(startOffset, startOffset) < radius * radius) t = 0;
    else if (h >= 0 && Math.abs(aa) > 1e-12) {
      const candidate = (-bb - Math.sqrt(h)) / aa, along = bo + candidate * bd;
      if (candidate >= 0 && candidate <= 1 && along >= 0 && along <= length) t = candidate;
    }
  }
  for (const center of [a, b]) {
    const candidate = sphereHit(p, d, center, radius);
    if (candidate !== null && (t === null || candidate < t)) t = candidate;
  }
  if (t === null) return null;
  const point = p.map((v, i) => v + d[i] * t);
  const along = length > 1e-10 ? clamp(dot(sub(point, a), ba) / length, 0, 1) : 0;
  const normal = sub(point, a.map((v, i) => v + ba[i] * along));
  const magnitude = Math.hypot(...normal) || 1;
  const n = normal.map(v => v / magnitude);
  if (shot.vx * n[0] + shot.vy * n[1] + shot.vz * n[2] >= 0) return null;
  return { t, point, normal: n, type };
}

function worldPart(point, x, y, z, lean = 0) {
  const py = point[1] - 1;
  return [x + point[0] * Math.cos(lean) - py * Math.sin(lean), y + 1 + point[0] * Math.sin(lean) + py * Math.cos(lean), z + point[2]];
}

function collisions(before, shot, keeper, options) {
  let closest = null;
  const check = (a, b, radius, type) => {
    const hit = capsuleHit(before, shot, a, b, radius, type);
    if (hit && (!closest || hit.t < closest.t)) closest = hit;
  };
  if (options.wall !== false && Math.abs(shot.z - FIELD.wallZ) < 0.7) {
    FIELD.wallCenters.forEach((x, index) => {
      const jump = wallJump(shot.time, index);
      for (const part of playerParts()) check(worldPart(part.a, x, jump, FIELD.wallZ), worldPart(part.b, x, jump, FIELD.wallZ), part.r, 'wall');
    });
  }
  if (keeper !== null && Math.abs(shot.z - FIELD.keeperZ) < 0.8) {
    const pose = typeof keeper === 'number' ? { x: keeper, y: 0, lean: 0, diveTime: null } : keeper;
    for (const part of playerParts(true, pose.diveTime !== null)) {
      check(worldPart(part.a, pose.x, pose.y, FIELD.keeperZ, pose.lean), worldPart(part.b, pose.x, pose.y, FIELD.keeperZ, pose.lean), part.r, 'save');
    }
  }
  if (options.frame !== false && Math.abs(shot.z - FIELD.goalZ) < 0.5) {
    const x = FIELD.goalHalfWidth + FIELD.postRadius, y = FIELD.goalHeight + FIELD.postRadius;
    for (const sign of [-1, 1]) check([sign * x, 0, FIELD.goalZ], [sign * x, y, FIELD.goalZ], FIELD.postRadius, 'post');
    check([-x, y, FIELD.goalZ], [x, y, FIELD.goalZ], FIELD.postRadius, 'post');
  }
  return closest;
}

function resolveCollision(shot, hit) {
  [shot.x, shot.y, shot.z] = hit.point.map((v, i) => v + hit.normal[i] * 0.001);
  const velocity = [shot.vx, shot.vy, shot.vz], normalSpeed = dot(velocity, hit.normal);
  const restitution = hit.type === 'post' ? 0.72 : hit.type === 'wall' ? 0.28 : 0.12;
  [shot.vx, shot.vy, shot.vz] = velocity.map((v, i) => (v - (1 + restitution) * normalSpeed * hit.normal[i]) * (hit.type === 'save' ? 0.25 : 0.9));
  shot.rolling = false;
  impact(shot, hit.type);
  if (hit.type === 'wall') shot.wallHit = true;
  if (hit.type === 'post') shot.postHit = true;
  if (hit.type === 'save') shot.result = 'save';
}

export function advanceShot(shot, dt, keeper = null, options = {}) {
  if (shot.result || !Number.isFinite(dt) || dt <= 0) return shot;
  const steps = Math.ceil(dt / PHYSICS.step), step = dt / steps;
  for (let i = 0; i < steps && !shot.result; i++) {
    const previous = { x: shot.x, y: shot.y, z: shot.z };
    integrate(shot, step);
    const hit = collisions(previous, shot, keeper, options);
    if (hit) resolveCollision(shot, hit);
    groundContact(shot);
    const goalPlane = FIELD.goalZ - FIELD.postRadius - FIELD.ballRadius;
    if (!shot.result && previous.z > goalPlane && shot.z <= goalPlane) {
      const t = (previous.z - goalPlane) / (previous.z - shot.z);
      const x = previous.x + (shot.x - previous.x) * t, y = previous.y + (shot.y - previous.y) * t;
      const insideX = Math.abs(x) <= FIELD.goalHalfWidth - FIELD.ballRadius;
      const insideY = y >= FIELD.ballRadius - 0.001 && y <= FIELD.goalHeight - FIELD.ballRadius;
      shot.result = insideX && insideY ? 'goal' : shot.postHit ? 'post' : !insideX ? 'wide' : 'over';
      shot.x = x; shot.y = y; shot.z = goalPlane;
    }
    if (!shot.result && shot.vz > 0 && ((shot.wallHit && shot.z > FIELD.wallZ + 0.6) || (shot.postHit && shot.z > FIELD.goalZ + 0.6))) {
      shot.result = shot.wallHit ? 'wall' : 'post';
    }
    if (!shot.result && (shot.time >= 6 - 1e-8 || Math.hypot(shot.vx, shot.vy, shot.vz) < 0.5 || shot.z > FIELD.startZ + 5)) {
      shot.result = shot.wallHit ? 'wall' : shot.postHit ? 'post' : 'ground';
    }
  }
  return shot;
}

// Continue after the result: the net catches a goal; saves and misses fall,
// bounce and roll instead of freezing in midair.
export function advanceAftermath(shot, dt) {
  const steps = Math.ceil(dt / PHYSICS.step), step = dt / Math.max(1, steps);
  for (let i = 0; i < steps; i++) {
    integrate(shot, step);
    groundContact(shot);
    if (shot.result === 'goal') {
      const back = FIELD.goalZ - 1.95 + FIELD.ballRadius;
      if (shot.z < back && shot.vz < 0) { shot.z = back; shot.vz *= -0.12; shot.vx *= 0.45; shot.vy *= 0.45; impact(shot, 'net'); }
      const side = FIELD.goalHalfWidth - FIELD.ballRadius;
      if (Math.abs(shot.x) > side) { shot.x = Math.sign(shot.x) * side; shot.vx *= -0.12; impact(shot, 'net'); }
      if (shot.y > FIELD.goalHeight - FIELD.ballRadius) { shot.y = FIELD.goalHeight - FIELD.ballRadius; shot.vy *= -0.12; impact(shot, 'net'); }
    }
  }
  return shot;
}

export function predictShot(config, options = {}) {
  const shot = makeShot(config), points = [[shot.x, shot.y, shot.z]];
  for (let i = 0; i < 1440 && !shot.result; i++) {
    advanceShot(shot, 1 / 240, null, options);
    if (i % 12 === 11 || shot.result || (shot.impact && shot.impact.time === shot.time)) points.push([shot.x, shot.y, shot.z]);
  }
  return { points, result: shot.result, landing: [shot.x, shot.y, shot.z], shot };
}
