export const FIELD = Object.freeze({
  startZ: 10,
  wallZ: 0.85,
  keeperZ: -11.9,
  goalZ: -13,
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  ballRadius: 0.22,
  wallCenters: [-1.2, -0.4, 0.4, 1.2]
});

export function makeShot({ aim = 0, power = 70, side = 0, height = 1, wind = 0 } = {}) {
  const speed = 16 + power * 0.13;
  const angle = aim * Math.PI / 180;
  return {
    x: 0, y: FIELD.ballRadius, z: FIELD.startZ,
    vx: Math.sin(angle) * speed,
    vy: 6.35 - height * 0.8 + (power - 70) * 0.014,
    vz: -Math.cos(angle) * speed,
    side, wind, time: 0, result: null
  };
}

export function advanceShot(shot, dt, keeperX = null) {
  if (shot.result) return shot;
  const previous = { ...shot };
  const drag = 1 - Math.min(0.08, dt * 0.018);
  shot.vx = shot.vx * drag + (shot.wind * 0.42 + shot.side * 1.65 * Math.exp(-shot.time * 0.55)) * dt;
  shot.vy = shot.vy * drag - 11.5 * dt;
  shot.vz *= drag;
  shot.x += shot.vx * dt;
  shot.y += shot.vy * dt;
  shot.z += shot.vz * dt;
  shot.time += dt;

  if (crossed(previous.z, shot.z, FIELD.wallZ)) {
    const p = atPlane(previous, shot, FIELD.wallZ);
    if (p.y - FIELD.ballRadius < 1.78 && FIELD.wallCenters.some(x => Math.abs(p.x - x) < 0.43 + FIELD.ballRadius)) {
      shot.x = p.x; shot.y = Math.max(FIELD.ballRadius, p.y); shot.z = FIELD.wallZ;
      shot.result = 'wall'; return shot;
    }
  }
  if (keeperX !== null && crossed(previous.z, shot.z, FIELD.keeperZ)) {
    const p = atPlane(previous, shot, FIELD.keeperZ);
    if (Math.abs(p.x - keeperX) < 0.85 && p.y < 2.5) {
      shot.x = p.x; shot.y = p.y; shot.z = FIELD.keeperZ;
      shot.result = 'save'; return shot;
    }
  }
  if (crossed(previous.z, shot.z, FIELD.goalZ)) {
    const p = atPlane(previous, shot, FIELD.goalZ);
    shot.x = p.x; shot.y = p.y; shot.z = FIELD.goalZ;
    const insideX = Math.abs(p.x) < FIELD.goalHalfWidth - FIELD.ballRadius;
    const insideY = p.y > FIELD.ballRadius && p.y < FIELD.goalHeight - FIELD.ballRadius;
    const nearPost = Math.abs(Math.abs(p.x) - FIELD.goalHalfWidth) < FIELD.ballRadius + 0.11 && p.y < FIELD.goalHeight + 0.12;
    const nearBar = Math.abs(p.y - FIELD.goalHeight) < FIELD.ballRadius + 0.11 && Math.abs(p.x) < FIELD.goalHalfWidth + 0.1;
    shot.result = insideX && insideY ? 'goal' : nearPost || nearBar ? 'post' : p.y >= FIELD.goalHeight ? 'over' : 'wide';
    return shot;
  }
  if (shot.y <= FIELD.ballRadius && shot.time > 0.08) {
    shot.y = FIELD.ballRadius;
    shot.result = 'ground';
  }
  return shot;
}

export function predictShot(config) {
  const shot = makeShot(config);
  const points = [[shot.x, shot.y, shot.z]];
  for (let i = 0; i < 500 && !shot.result; i++) {
    advanceShot(shot, 1 / 120);
    if (i % 6 === 5 || shot.result) points.push([shot.x, shot.y, shot.z]);
  }
  return { points, result: shot.result, landing: [shot.x, shot.y, shot.z] };
}

function crossed(before, after, plane) { return before > plane && after <= plane; }
function atPlane(before, after, plane) {
  const t = (before.z - plane) / (before.z - after.z);
  return { x: before.x + (after.x - before.x) * t, y: before.y + (after.y - before.y) * t };
}
