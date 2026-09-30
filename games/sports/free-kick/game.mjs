import * as THREE from '../../../assets/vendor/three.module.r160.js';
import { FIELD, PHYSICS, makeShot, advanceShot, advanceAftermath, predictShot, makeKeeper, advanceKeeper, wallJump, playerParts } from './physics.mjs';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const aimInput = $('aimInput');
const powerInput = $('powerInput');
const shootButton = $('shootButton');
const nextButton = $('nextButton');
const resultBanner = $('resultBanner');
const summary = $('shotSummary');
const state = { aim: -12, power: 82, side: -1, height: -1, wind: 0, shots: 0, goals: 0, shot: null, phase: 'ready', keeper: makeKeeper(), runup: 0, aftermath: 0 };
const resultText = {
  goal: ['精彩进球！', '漂亮的弧线钻入球网'], wall: ['被人墙挡下', '试试击打足球下沿，让球飞得更高'],
  save: ['门将扑救！', '增加弧线，瞄准更远的门角'], post: ['击中门框！', '只差一点点，微调角度再来'],
  over: ['高出横梁', '提高触球点，让射门压低一些'], wide: ['偏出球门', '旋转会改变终点，调整瞄准方向再试'],
  ground: ['射门失去速度', '增加力度或击打下沿，延长飞行距离']
};

let renderer, scene, camera, ball, ballShadow, keeper, shooter, flightLine, landingRing, goalNet;
const wallPlayers = [];
const spinAxis = new THREE.Vector3(), spinRotation = new THREE.Quaternion();
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x799fb5);
  scene.fog = new THREE.Fog(0x799fb5, 48, 125);
  camera = new THREE.PerspectiveCamera(53, 1, 0.1, 140);
  buildWorld();
  resize();
  new ResizeObserver(resize).observe(canvas);
  requestAnimationFrame(animate);
} catch (error) {
  canvas.insertAdjacentHTML('afterend', '<p class="render-error">无法启动 3D 画面，请在支持 WebGL 的浏览器中打开。</p>');
  shootButton.disabled = true;
  console.error(error);
}

function mesh(geometry, material, x = 0, y = 0, z = 0, shadows = true) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = shadows;
  item.receiveShadow = shadows;
  return item;
}
function mat(color, roughness = 0.9) { return new THREE.MeshStandardMaterial({ color, roughness }); }
function box(width, height, depth, material, x, y, z) { return mesh(new THREE.BoxGeometry(width, height, depth), material, x, y, z); }
function barBetween(a, b, radius, material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const item = mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 10), material);
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return item;
}
function line(points, color = 0xffffff, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

function buildWorld() {
  scene.add(new THREE.HemisphereLight(0xe1f1ff, 0x355a27, 1.7));
  const sun = new THREE.DirectionalLight(0xfff3da, 2.5);
  sun.position.set(-12, 27, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const flood = new THREE.PointLight(0xb8f4ff, 65, 75, 2);
  flood.position.set(14, 16, -12); scene.add(flood);

  const grass = mat(0xc4d4b0, 1);
  const turf = document.createElement('canvas'); turf.width = turf.height = 256;
  const turfContext = turf.getContext('2d');
  turfContext.fillStyle = '#759456'; turfContext.fillRect(0, 0, 256, 256);
  let seed = 42;
  const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 18000; i++) {
    const value = Math.floor(65 + noise() * 70);
    turfContext.fillStyle = `rgba(${value},${value + 38},${value - 22},.45)`;
    turfContext.fillRect(noise() * 256, noise() * 256, 1, 2 + noise() * 3);
  }
  const turfTexture = new THREE.CanvasTexture(turf);
  turfTexture.wrapS = turfTexture.wrapT = THREE.RepeatWrapping; turfTexture.repeat.set(28, 84);
  turfTexture.colorSpace = THREE.SRGBColorSpace; turfTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  grass.map = turfTexture;
  const field = mesh(new THREE.PlaneGeometry(90, 300), grass, 0, 0, -45, false);
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true; scene.add(field);
  for (let z = -33, index = 0; z < 49; z += 6, index++) {
    const stripe = mesh(new THREE.PlaneGeometry(90, 6), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x162d08 : 0xcbe6a0, transparent: true, opacity: 0.09 }), 0, .001, z, false);
    stripe.rotation.x = -Math.PI / 2; scene.add(stripe);
  }
  const white = 0xe9fcf5;
  scene.add(line([[-34, .018, FIELD.goalZ + 105], [34, .018, FIELD.goalZ + 105], [34, .018, FIELD.goalZ], [-34, .018, FIELD.goalZ], [-34, .018, FIELD.goalZ + 105]], white, .8));
  scene.add(line([[-20.16, .02, FIELD.goalZ], [-20.16, .02, 3.5], [20.16, .02, 3.5], [20.16, .02, FIELD.goalZ]], white, .72));
  scene.add(line([[-9.16, .021, FIELD.goalZ], [-9.16, .021, -7.5], [9.16, .021, -7.5], [9.16, .021, FIELD.goalZ]], white, .68));
  const spot = mesh(new THREE.CircleGeometry(.11, 20), new THREE.MeshBasicMaterial({ color: white }), 0, .022, -2, false);
  spot.rotation.x = -Math.PI / 2; scene.add(spot);
  const arcAngle = Math.asin(5.5 / 9.15);
  const arc = new THREE.EllipseCurve(0, -2, 9.15, 9.15, arcAngle, Math.PI - arcAngle, false, 0);
  scene.add(line(arc.getPoints(36).map(p => [p.x, .023, p.y]), white, .45));

  // Goal frame and visible mesh net.
  const frame = mat(0xf7ffff, .23);
  const gx = FIELD.goalHalfWidth + FIELD.postRadius, gz = FIELD.goalZ, gh = FIELD.goalHeight + FIELD.postRadius;
  for (const x of [-gx, gx]) {
    scene.add(barBetween([x, 0, gz], [x, gh, gz], FIELD.postRadius, frame));
    scene.add(barBetween([x, gh, gz], [x, gh, gz - 2], .04, frame));
    scene.add(barBetween([x, 0, gz - 2], [x, gh, gz - 2], .035, frame));
  }
  scene.add(barBetween([-gx, gh, gz], [gx, gh, gz], FIELD.postRadius, frame));
  scene.add(barBetween([-gx, gh, gz - 2], [gx, gh, gz - 2], .04, frame));
  const netPoints = [];
  const addNetLine = (a, b) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    for (let i = 0; i < 20; i++) netPoints.push(...start.clone().lerp(end, i / 20).toArray(), ...start.clone().lerp(end, (i + 1) / 20).toArray());
  };
  for (let x = -gx; x <= gx + .01; x += .22) {
    addNetLine([x, 0, gz - 2], [x, gh, gz - 2]);
    addNetLine([x, gh, gz], [x, gh, gz - 2]);
  }
  for (let y = 0; y <= gh + .01; y += .22) {
    addNetLine([-gx, y, gz - 2], [gx, y, gz - 2]);
    for (const sign of [-1, 1]) addNetLine([sign * gx, y, gz], [sign * gx, y, gz - 2]);
  }
  for (let z = gz; z >= gz - 2; z -= .22) {
    addNetLine([-gx, gh, z], [gx, gh, z]);
    for (const sign of [-1, 1]) addNetLine([sign * gx, 0, z], [sign * gx, gh, z]);
  }
  const netGeometry = new THREE.BufferGeometry();
  netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3));
  goalNet = new THREE.LineSegments(netGeometry, new THREE.LineBasicMaterial({ color: 0xf5f4e8, transparent: true, opacity: .5 }));
  goalNet.userData.rest = new Float32Array(netPoints); goalNet.frustumCulled = false; scene.add(goalNet);

  // Stylized crowd and floodlit stadium walls frame the playable field.
  const stand = mat(0x0c263b), accent = new THREE.MeshBasicMaterial({ color: 0x85b6ce });
  for (const x of [-27, 27]) {
    scene.add(box(6, 6, 90, stand, x, 1.8, 0));
    for (let z = -38; z <= 33; z += 2.3) {
      const crowd = [0x5fb8bc, 0xf1cf74, 0xc6eaf1, 0x50876f, 0xc0aaca][Math.abs(Math.round(z * 3 + x)) % 5];
      scene.add(box(.08, .14, .1, new THREE.MeshBasicMaterial({ color: crowd }), x > 0 ? 23.9 : -23.9, 4.1 + (Math.abs(Math.round(z)) % 3) * .42, z));
    }
    scene.add(box(.12, .08, 84, accent, x > 0 ? 23.8 : -23.8, 3.65, -2));
  }
  const seats = mat(0x304b60), spectators = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 6, 5), mat(0xffffff), 12 * 108);
  const crowdTransform = new THREE.Object3D(), crowdColor = new THREE.Color();
  const crowdPalette = [0xd4c2a4, 0x345771, 0x9baaaa, 0xab584e, 0xc9bb70, 0x506975];
  for (let row = 0; row < 12; row++) {
    const y = .6 + row * .6, z = -24 - row * 1.1;
    scene.add(box(65, .45, 1.2, seats, 0, y - .3, z));
    for (let column = 0; column < 108; column++) {
      crowdTransform.position.set(-31.8 + column * .59, y + .25, z);
      crowdTransform.scale.set(.85, 1.8, .9); crowdTransform.updateMatrix();
      const index = row * 108 + column;
      spectators.setMatrixAt(index, crowdTransform.matrix);
      spectators.setColorAt(index, crowdColor.setHex(crowdPalette[(row * 17 + column * 7) % crowdPalette.length]));
    }
  }
  scene.add(spectators);
  scene.add(box(67, .2, 15, mat(0x233d52), 0, 11, -30));
  for (const x of [-32, -16, 16, 32]) scene.add(barBetween([x, 0, -36], [x, 11, -36], .12, seats));
  const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 64;
  const boardContext = boardCanvas.getContext('2d');
  boardContext.fillStyle = '#142b40'; boardContext.fillRect(0, 0, 1024, 64);
  boardContext.fillStyle = '#dceac6'; boardContext.font = 'bold 28px Arial'; boardContext.textAlign = 'center';
  boardContext.fillText('PHDSX     •     FOOTBALL     •     PHDSX     •     FOOTBALL', 512, 43);
  const boardTexture = new THREE.CanvasTexture(boardCanvas); boardTexture.colorSpace = THREE.SRGBColorSpace;
  scene.add(mesh(new THREE.PlaneGeometry(44, .85), new THREE.MeshBasicMaterial({ map: boardTexture }), 0, .55, -21, false));

  for (let i = 0; i < FIELD.wallCenters.length; i++) {
    const player = makePlayer(i % 2 ? 0x1160a3 : 0x0c5391, 0xe5e8ed, 0xe9b989);
    player.position.set(FIELD.wallCenters[i], 0, FIELD.wallZ);
    scene.add(player);
    wallPlayers.push(player);
  }
  keeper = makePlayer(0xf5a51d, 0x172843, 0xdba574, true);
  keeper.position.set(0, 0, FIELD.keeperZ);
  scene.add(keeper);
  shooter = makePlayer(0xc6283e, 0xe8edf0, 0xd6a47a);
  shooter.rotation.y = Math.PI; shooter.position.set(.9, 0, FIELD.startZ + 2.6); scene.add(shooter);
  const ballTexture = soccerTexture();
  ball = mesh(new THREE.SphereGeometry(FIELD.ballRadius, 32, 20), new THREE.MeshStandardMaterial({ map: ballTexture, roughness: .38 }), 0, FIELD.ballRadius, FIELD.startZ);
  scene.add(ball);
  ballShadow = mesh(new THREE.CircleGeometry(.15, 24), new THREE.MeshBasicMaterial({ color: 0x071f1a, transparent: true, opacity: .35 }), 0, .006, FIELD.startZ, false);
  ballShadow.rotation.x = -Math.PI / 2; scene.add(ballShadow);
  landingRing = mesh(new THREE.RingGeometry(.28, .34, 40), new THREE.MeshBasicMaterial({ color: 0xb9fb5c, side: THREE.DoubleSide, transparent: true, opacity: .8 }), 0, .035, 0, false);
  landingRing.rotation.x = -Math.PI / 2; scene.add(landingRing);
  camera.position.set(0, 8.5, 25);
  camera.lookAt(0, 0, 0);
}

function makePlayer(jersey, shorts, skin, isKeeper = false) {
  const group = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1; group.add(body);
  const materials = { shirt: mat(jersey, .85), sleeve: mat(jersey), shorts: mat(shorts), head: mat(skin), skin: mat(skin), sock: mat(isKeeper ? 0x172843 : 0xe7edf1), glove: mat(0xf0faed), boot: mat(0x17212a) };
  const addPose = diving => {
    const pose = new THREE.Group();
    const legs = [new THREE.Group(), new THREE.Group()];
    legs.forEach((leg, i) => { leg.position.set((i ? 1 : -1) * .15, -.31, 0); pose.add(leg); });
    for (const part of playerParts(isKeeper, diving)) {
      const a = new THREE.Vector3(...part.a), b = new THREE.Vector3(...part.b);
      const length = a.distanceTo(b);
      const item = mesh(length < .001 ? new THREE.SphereGeometry(part.r, 16, 12) : new THREE.CapsuleGeometry(part.r, length, 5, 12), materials[part.kind]);
      item.position.copy(a).add(b).multiplyScalar(.5); item.position.y -= 1;
      if (length > .001) item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
      if (part.a[1] < .7) {
        const leg = legs[part.a[0] > 0 ? 1 : 0]; item.position.sub(leg.position); leg.add(item);
      } else pose.add(item);
    }
    const hair = mesh(new THREE.SphereGeometry(.163, 16, 10, 0, Math.PI * 2, 0, Math.PI * .45), mat(0x25201c), 0, .73, 0);
    pose.add(hair);
    pose.add(mesh(new THREE.SphereGeometry(.038, 8, 6), materials.skin, 0, .68, .155));
    for (const sign of [-1, 1]) pose.add(mesh(new THREE.SphereGeometry(.013, 6, 4), materials.boot, sign * .055, .735, .147));
    pose.add(box(.38, .035, .014, materials.shorts, 0, .3, .232));
    pose.userData.legs = legs; body.add(pose);
    return pose;
  };
  const normal = addPose(false), dive = isKeeper ? addPose(true) : null;
  if (dive) dive.visible = false;
  group.userData = { body, normal, dive, legs: normal.userData.legs };
  const numberCanvas = document.createElement('canvas'); numberCanvas.width = 64; numberCanvas.height = 80;
  const numberContext = numberCanvas.getContext('2d'); numberContext.fillStyle = '#fff'; numberContext.font = 'bold 66px Arial'; numberContext.textAlign = 'center'; numberContext.fillText(isKeeper ? '1' : '7', 32, 65);
  const numberTexture = new THREE.CanvasTexture(numberCanvas); numberTexture.colorSpace = THREE.SRGBColorSpace;
  const number = mesh(new THREE.PlaneGeometry(.22, .28), new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true }), 0, .15, -.235, false);
  number.rotation.y = Math.PI; normal.add(number);
  const shade = mesh(new THREE.CircleGeometry(.4, 16), new THREE.MeshBasicMaterial({ color: 0x0b2c25, transparent: true, opacity: .26 }), 0, .018, 0, false);
  shade.rotation.x = -Math.PI / 2; group.add(shade); group.userData.shadow = shade;
  return group;
}

function soccerTexture() {
  const textureCanvas = document.createElement('canvas'); textureCanvas.width = 512; textureCanvas.height = 256;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#f4f7f1'; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#9da9a6'; ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
    const x = col * 61 + (row % 2) * 30, y = row * 62 + 23;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const px = x + Math.cos(a) * 25, py = y + Math.sin(a) * 25; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.stroke();
    if ((row + col) % 3 === 0) {
      ctx.fillStyle = '#132737'; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; const px = x + Math.cos(a) * 14, py = y + Math.sin(a) * 14; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function resize() {
  if (!renderer) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 560 ? 57 : 51;
  camera.position.set(0, width < 560 ? 6.4 : 4.6, width < 560 ? 23 : 19.8);
  camera.lookAt(0, 1, -3);
  camera.updateProjectionMatrix();
}

function config() { return { aim: state.aim, power: state.power, side: state.side, height: state.height, wind: state.wind }; }
function updatePreview() {
  $('aimValue').textContent = `${state.aim > 0 ? '+' : ''}${state.aim}°`;
  $('powerValue').textContent = `${state.power}%`;
  $('speedValue').textContent = `${Math.round(makeShot(config()).speed * 3.6)} km/h`;
  const heights = { '-1': '挑起 / 回旋', 0: '平抽', 1: '低射 / 前旋' };
  const bend = state.side < 0 ? '右弯' : state.side > 0 ? '左弯' : '直线';
  $('contactValue').textContent = `${bend} · ${heights[state.height]}`;
  if (!scene || state.phase !== 'ready') return;
  const prediction = predictShot(config());
  if (flightLine) { scene.remove(flightLine); flightLine.geometry.dispose(); flightLine.material.dispose(); }
  const geometry = new THREE.BufferGeometry().setFromPoints(prediction.points.map(p => new THREE.Vector3(...p)));
  flightLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: 0xd9ff85, transparent: true, opacity: .82, dashSize: .25, gapSize: .17 }));
  flightLine.computeLineDistances(); scene.add(flightLine);
  flightLine.visible = $('trajectoryInput').checked;
  landingRing.position.x = prediction.landing[0];
  landingRing.position.z = prediction.landing[2];
  landingRing.visible = $('trajectoryInput').checked && ['goal', 'wide', 'over', 'ground'].includes(prediction.result);
  const messages = { goal: '轨迹可入门！留意门将的扑救。', wall: '轨迹撞上人墙：尝试击打球的下沿或绕向两侧。',
    post: '轨迹擦到门框：微调射门角度。', over: '轨迹高出横梁：调整击球点或力度。',
    wide: '轨迹偏出：瞄准更靠近球门的方向。', ground: '球会落地减速：增加力度或击打下沿。' };
  summary.textContent = $('trajectoryInput').checked ? `参考：${messages[prediction.result] || '调整参数，寻找进球路线。'} 人墙会起跳，门将会扑救。` : '比赛视野：参考风向和触球点，自己判断落点。';
}

function setWind() {
  state.wind = Math.round((Math.random() * 6 - 3) * 10) / 10;
  $('windValue').textContent = `${Math.abs(state.wind).toFixed(1)}`;
  $('windArrow').textContent = state.wind < -0.15 ? '←' : state.wind > 0.15 ? '→' : '·';
  $('windArrow').setAttribute('aria-label', state.wind < 0 ? '向左' : state.wind > 0 ? '向右' : '无风');
}
function updateScore() {
  $('shotsValue').textContent = state.shots;
  $('goalsValue').textContent = state.goals;
  $('accuracyValue').textContent = `${state.shots ? Math.round(state.goals / state.shots * 100) : 0}%`;
}
function finish(result) {
  state.phase = 'finished';
  state.aftermath = 0;
  state.shots++;
  if (result === 'goal') state.goals++;
  updateScore();
  const [headline, detail] = resultText[result] || ['射门结束', '再试一次'];
  resultBanner.innerHTML = `${headline}<small>${detail}</small><button class="result-next" type="button">下一球 →</button>`;
  resultBanner.hidden = false;
  shootButton.hidden = true;
  nextButton.hidden = false;
  document.querySelector('.panel-live').innerHTML = '<i></i> 本次结束';
  summary.textContent = result === 'goal' ? '弧线、力度与风向配合得恰到好处！' : detail;
}
function lockControls(locked) {
  aimInput.disabled = powerInput.disabled = locked;
  document.querySelectorAll('#contactPicker button').forEach(button => { button.disabled = locked; });
}
function startShot() {
  if (state.phase !== 'ready' || !renderer) return;
  state.shot = makeShot(config()); state.phase = 'runup'; state.runup = 0;
  state.keeper = makeKeeper();
  resultBanner.hidden = true;
  shootButton.disabled = true;
  lockControls(true);
  if (flightLine) flightLine.visible = false;
  landingRing.visible = false;
  document.querySelector('.panel-live').innerHTML = '<i></i> 助跑中';
  summary.textContent = '助跑、支撑脚落位、触球…';
  if (matchMedia('(max-width:760px)').matches) canvas.closest('.stadium').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
function nextShot() {
  state.phase = 'ready'; state.shot = null;
  state.keeper = makeKeeper(); state.runup = 0; state.aftermath = 0;
  ball.position.set(0, FIELD.ballRadius, FIELD.startZ);
  ball.rotation.set(0, 0, 0);
  keeper.position.set(0, 0, FIELD.keeperZ); keeper.userData.body.rotation.z = 0;
  keeper.userData.shadow.position.y = .018;
  keeper.userData.normal.visible = true; keeper.userData.dive.visible = false;
  shooter.position.set(.9, 0, FIELD.startZ + 2.6);
  shooter.userData.legs.forEach(leg => { leg.rotation.x = 0; });
  wallPlayers.forEach(player => { player.position.y = 0; player.userData.shadow.position.y = .018; });
  goalNet.geometry.attributes.position.array.set(goalNet.userData.rest);
  goalNet.geometry.attributes.position.needsUpdate = true;
  lockControls(false);
  setWind();
  resultBanner.hidden = true;
  shootButton.hidden = false; shootButton.disabled = false;
  nextButton.hidden = true;
  document.querySelector('.panel-live').innerHTML = '<i></i> 准备射门';
  updatePreview();
}

function simulationStep(dt) {
  if (state.phase === 'runup') {
    state.runup += dt;
    const t = Math.min(1, state.runup / .65);
    shooter.position.set(.9 + (.19 - .9) * t, 0, FIELD.startZ + 2.6 - 2.3 * t);
    shooter.userData.legs.forEach((leg, i) => { leg.rotation.x = t < .8 ? Math.sin(t * Math.PI * 5 + i * Math.PI) * .45 : i === 1 ? -(t - .8) * 1.5 : .1; });
    if (t === 1) {
      state.phase = 'flying';
      document.querySelector('.panel-live').innerHTML = '<i></i> 足球飞行中';
      summary.textContent = '旋转和侧风正在改变球路，门将开始判断落点…';
    }
    return;
  }
  if (state.phase === 'flying') {
    advanceKeeper(state.keeper, state.shot, dt);
    advanceShot(state.shot, dt, state.keeper);
    if (state.shot.result) finish(state.shot.result);
  } else if (state.phase === 'finished' && state.aftermath < 3) {
    state.aftermath += dt;
    advanceAftermath(state.shot, dt);
    advanceKeeper(state.keeper, state.shot, dt);
  }
}

function updateActors(dt) {
  const shot = state.shot;
  if (shot && state.phase !== 'runup') {
    ball.position.set(shot.x, shot.y, shot.z);
    spinAxis.set(shot.spinX, shot.spinY, shot.spinZ);
    const speed = spinAxis.length();
    if (speed > .001) { spinRotation.setFromAxisAngle(spinAxis.divideScalar(speed), speed * dt); ball.quaternion.premultiply(spinRotation); }
    $('speedValue').textContent = `${Math.round(Math.hypot(shot.vx, shot.vy, shot.vz) * 3.6)} km/h`;
    wallPlayers.forEach((player, i) => {
      player.position.y = wallJump(shot.time, i);
      player.userData.shadow.position.y = .018 - player.position.y;
    });
    const pose = state.keeper;
    keeper.position.set(pose.x, pose.y, FIELD.keeperZ);
    keeper.userData.body.rotation.z = pose.lean;
    keeper.userData.shadow.position.y = .018 - pose.y;
    keeper.userData.normal.visible = pose.diveTime === null;
    keeper.userData.dive.visible = pose.diveTime !== null;
    shooter.userData.legs[1].rotation.x = shot.time < .15 ? -.3 - shot.time / .15 * .8 : -1.1 * Math.exp(-(shot.time - .15) * 5);
    const position = goalNet.geometry.attributes.position, rest = goalNet.userData.rest;
    const hit = shot.impact;
    const elapsed = hit?.type === 'net' ? shot.time - hit.time : 10;
    const strength = elapsed < 1.5 ? .36 * Math.exp(-elapsed * 4) * Math.sin(elapsed * 23) : 0;
    for (let i = 0; i < rest.length; i += 3) {
      const distance = hit ? ((rest[i] - hit.x) ** 2 + (rest[i + 1] - hit.y) ** 2 + (rest[i + 2] - hit.z) ** 2) : 100;
      const edge = Math.min(1, Math.max(0, rest[i + 1]) * 3);
      position.array[i + 2] = rest[i + 2] - strength * Math.exp(-distance * .8) * edge;
    }
    position.needsUpdate = true;
  }
  ballShadow.position.set(ball.position.x, .006, ball.position.z);
  ballShadow.scale.setScalar(1 + ball.position.y * .18);
  ballShadow.material.opacity = .32 / (1 + ball.position.y * .65);
}

let lastFrame = performance.now(), accumulator = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.1, (now - lastFrame) / 1000);
  lastFrame = now;
  accumulator += dt;
  while (accumulator >= PHYSICS.step) { simulationStep(PHYSICS.step); accumulator -= PHYSICS.step; }
  updateActors(dt);
  if (landingRing?.visible) landingRing.material.opacity = .52 + Math.sin(now * .006) * .22;
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); accumulator = 0; });

document.querySelectorAll('#contactPicker button').forEach(button => {
  button.addEventListener('click', () => {
    if (state.phase !== 'ready') return;
    document.querySelectorAll('#contactPicker button').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    state.side = Number(button.dataset.side); state.height = Number(button.dataset.height);
    updatePreview();
  });
});
document.querySelectorAll('#contactPicker button').forEach(button => { const active = Number(button.dataset.side) === state.side && Number(button.dataset.height) === state.height; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
aimInput.addEventListener('input', () => { state.aim = Number(aimInput.value); updatePreview(); });
powerInput.addEventListener('input', () => { state.power = Number(powerInput.value); updatePreview(); });
$('trajectoryInput').addEventListener('change', updatePreview);
shootButton.addEventListener('click', startShot);
nextButton.addEventListener('click', nextShot);
resultBanner.addEventListener('click', event => { if (event.target.closest('.result-next')) nextShot(); });
$('resetButton').addEventListener('click', () => { state.shots = state.goals = 0; updateScore(); if (state.phase === 'finished') nextShot(); });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
  if (event.code === 'Space') { event.preventDefault(); state.phase === 'finished' ? nextShot() : startShot(); }
  if (state.phase === 'ready' && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
    event.preventDefault();
    state.aim = THREE.MathUtils.clamp(state.aim + (event.code === 'ArrowRight' ? .5 : -.5), -18, 18);
    aimInput.value = state.aim; updatePreview();
  }
});
setWind(); updatePreview(); updateScore();
