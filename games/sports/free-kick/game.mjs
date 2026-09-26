import * as THREE from '../../../assets/vendor/three.module.r160.js';
import { FIELD, makeShot, advanceShot, predictShot } from './physics.mjs';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const aimInput = $('aimInput');
const powerInput = $('powerInput');
const shootButton = $('shootButton');
const nextButton = $('nextButton');
const resultBanner = $('resultBanner');
const summary = $('shotSummary');
const state = { aim: -5, power: 82, side: -1, height: -1, wind: 0, shots: 0, goals: 0, shot: null, phase: 'ready', keeperTarget: 0 };
const resultText = {
  goal: ['精彩进球！', '漂亮的弧线钻入球网'], wall: ['被人墙挡下', '试试击打足球下沿，让球飞得更高'],
  save: ['门将扑救！', '增加弧线，瞄准更远的门角'], post: ['击中门框！', '只差一点点，微调角度再来'],
  over: ['高出横梁', '试试提高击球点或减少力度'], wide: ['偏出球门', '调整瞄准方向或弧线'],
  ground: ['足球提前落地', '击打下沿或增加力度']
};

let renderer, scene, camera, ball, keeper, flightLine, landingRing;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x092641);
  scene.fog = new THREE.Fog(0x092641, 38, 90);
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
  scene.add(new THREE.HemisphereLight(0xdaf1ff, 0x164025, 2.1));
  const sun = new THREE.DirectionalLight(0xe7f8ff, 2.7);
  sun.position.set(-12, 27, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const flood = new THREE.PointLight(0xb8f4ff, 65, 75, 2);
  flood.position.set(14, 16, -12); scene.add(flood);

  const grass = mat(0x277a4b, 1);
  const field = mesh(new THREE.PlaneGeometry(90, 300), grass, 0, -0.04, -45, false);
  field.rotation.x = -Math.PI / 2; field.receiveShadow = true; scene.add(field);
  for (let z = -33, index = 0; z < 49; z += 6, index++) {
    const stripe = mesh(new THREE.PlaneGeometry(90, 6), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x2b864f : 0x2e9254, transparent: true, opacity: 0.42 }), 0, -0.026, z, false);
    stripe.rotation.x = -Math.PI / 2; scene.add(stripe);
  }
  const white = 0xe9fcf5;
  scene.add(line([[-22, .018, 23], [22, .018, 23], [22, .018, -22], [-22, .018, -22], [-22, .018, 23]], white, .67));
  scene.add(line([[-20.16, .02, FIELD.goalZ], [-20.16, .02, 3.5], [20.16, .02, 3.5], [20.16, .02, FIELD.goalZ]], white, .72));
  scene.add(line([[-9.16, .021, FIELD.goalZ], [-9.16, .021, -7.5], [9.16, .021, -7.5], [9.16, .021, FIELD.goalZ]], white, .68));
  const spot = mesh(new THREE.CircleGeometry(.11, 20), new THREE.MeshBasicMaterial({ color: white }), 0, .022, -2, false);
  spot.rotation.x = -Math.PI / 2; scene.add(spot);
  const arc = new THREE.EllipseCurve(0, -2, 9.15, 9.15, Math.PI * .25, Math.PI * .75, false, 0);
  scene.add(line(arc.getPoints(36).map(p => [p.x, .023, p.y]), white, .45));

  // Goal frame and visible mesh net.
  const frame = mat(0xf7ffff, .23), netMat = new THREE.LineBasicMaterial({ color: 0xc9f3ff, transparent: true, opacity: .35 });
  const gx = FIELD.goalHalfWidth, gz = FIELD.goalZ, gh = FIELD.goalHeight;
  for (const x of [-gx, gx]) {
    scene.add(barBetween([x, 0, gz], [x, gh, gz], .07, frame));
    scene.add(barBetween([x, gh, gz], [x, gh - .22, gz - 2], .04, frame));
    scene.add(barBetween([x, 0, gz - 2], [x, gh - .22, gz - 2], .035, frame));
  }
  scene.add(barBetween([-gx, gh, gz], [gx, gh, gz], .07, frame));
  scene.add(barBetween([-gx, gh - .22, gz - 2], [gx, gh - .22, gz - 2], .04, frame));
  for (let x = -gx; x <= gx + .01; x += .42) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, gz - 2), new THREE.Vector3(x, gh - .22, gz - 2)]), netMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, gh, gz), new THREE.Vector3(x, gh - .22, gz - 2)]), netMat));
  }
  for (let y = 0; y <= gh; y += .38) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-gx, y, gz - 2), new THREE.Vector3(gx, y, gz - 2)]), netMat));
  }

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
  scene.add(box(50, 7, 5, stand, 0, 2.1, -29));
  scene.add(box(50, .12, .15, accent, 0, 5.7, -26.4));

  for (let i = 0; i < FIELD.wallCenters.length; i++) {
    const player = makePlayer(i % 2 ? 0x1160a3 : 0x0c5391, 0xe5e8ed, 0xe9b989);
    player.position.set(FIELD.wallCenters[i], 0, FIELD.wallZ);
    scene.add(player);
  }
  keeper = makePlayer(0xf5a51d, 0x172843, 0xdba574, true);
  keeper.position.set(0, 0, FIELD.keeperZ);
  scene.add(keeper);
  const ballTexture = soccerTexture();
  ball = mesh(new THREE.SphereGeometry(FIELD.ballRadius, 32, 20), new THREE.MeshStandardMaterial({ map: ballTexture, roughness: .38 }), 0, FIELD.ballRadius, FIELD.startZ);
  scene.add(ball);
  const shadow = mesh(new THREE.CircleGeometry(.33, 24), new THREE.MeshBasicMaterial({ color: 0x071f1a, transparent: true, opacity: .35 }), 0, .006, FIELD.startZ, false);
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  landingRing = mesh(new THREE.RingGeometry(.28, .34, 40), new THREE.MeshBasicMaterial({ color: 0xb9fb5c, side: THREE.DoubleSide, transparent: true, opacity: .8 }), 0, .035, 0, false);
  landingRing.rotation.x = -Math.PI / 2; scene.add(landingRing);
  camera.position.set(0, 8.5, 25);
  camera.lookAt(0, 0, 0);
}

function makePlayer(jersey, shorts, skin, isKeeper = false) {
  const group = new THREE.Group();
  const shirt = mat(jersey, .85), pant = mat(shorts), flesh = mat(skin), dark = mat(0x132d3e);
  group.add(mesh(new THREE.CylinderGeometry(.28, .31, .77, 9), shirt, 0, 1.18, 0));
  group.add(mesh(new THREE.SphereGeometry(.23, 12, 9), flesh, 0, 1.79, 0));
  group.add(mesh(new THREE.SphereGeometry(.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * .42), dark, 0, 1.84, 0));
  group.add(box(.57, .25, .3, pant, 0, .69, 0));
  for (const sign of [-1, 1]) {
    group.add(barBetween([sign * .21, .68, 0], [sign * .21, .17, .04], .105, flesh));
    group.add(box(.22, .13, .35, dark, sign * .21, .09, .11));
    group.add(barBetween([sign * .28, 1.43, 0], [sign * (isKeeper ? .57 : .37), .91, .05], .095, shirt));
    group.add(mesh(new THREE.SphereGeometry(.1, 8, 6), flesh, sign * (isKeeper ? .59 : .37), .87, .05));
  }
  const shade = mesh(new THREE.CircleGeometry(.4, 16), new THREE.MeshBasicMaterial({ color: 0x0b2c25, transparent: true, opacity: .26 }), 0, .018, 0, false);
  shade.rotation.x = -Math.PI / 2; group.add(shade);
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
  camera.fov = width < 560 ? 43 : 42;
  camera.position.set(0, width < 560 ? 12 : 10.5, width < 560 ? 35 : 32);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function config() { return { aim: state.aim, power: state.power, side: state.side, height: state.height, wind: state.wind }; }
function updatePreview() {
  $('aimValue').textContent = `${state.aim > 0 ? '+' : ''}${state.aim}°`;
  $('powerValue').textContent = `${state.power}%`;
  const parts = ['左侧', '正中', '右侧'];
  const heights = { '-1': '高弧线', 0: '中弧线', 1: '低平球' };
  $('contactValue').textContent = `${parts[state.side + 1]} · ${heights[state.height]}`;
  if (!scene || state.phase !== 'ready') return;
  const prediction = predictShot(config());
  if (flightLine) scene.remove(flightLine);
  const geometry = new THREE.BufferGeometry().setFromPoints(prediction.points.map(p => new THREE.Vector3(...p)));
  flightLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: 0xd9ff85, transparent: true, opacity: .82, dashSize: .25, gapSize: .17 }));
  flightLine.computeLineDistances(); scene.add(flightLine);
  landingRing.position.x = prediction.landing[0];
  landingRing.position.z = prediction.landing[2];
  landingRing.visible = ['goal', 'wide', 'over', 'ground'].includes(prediction.result);
  const messages = { goal: '轨迹可入门！留意门将的扑救。', wall: '轨迹撞上人墙：尝试击打球的下沿或绕向两侧。',
    post: '轨迹擦到门框：微调射门角度。', over: '轨迹高出横梁：调整击球点或力度。',
    wide: '轨迹偏出：瞄准更靠近球门的方向。', ground: '足球会提前落地：增加力度或击打下沿。' };
  summary.textContent = `预计：${messages[prediction.result] || '调整参数，寻找进球路线。'}`;
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
  state.shots++;
  if (result === 'goal') state.goals++;
  updateScore();
  const [headline, detail] = resultText[result] || ['射门结束', '再试一次'];
  resultBanner.innerHTML = `${headline}<small>${detail}</small>`;
  resultBanner.hidden = false;
  shootButton.hidden = true;
  nextButton.hidden = false;
  document.querySelector('.panel-live').innerHTML = '<i></i> 本次结束';
  summary.textContent = result === 'goal' ? '弧线、力度与风向配合得恰到好处！' : detail;
}
function startShot() {
  if (state.phase !== 'ready' || !renderer) return;
  state.shot = makeShot(config()); state.phase = 'flying';
  state.keeperTarget = 0;
  resultBanner.hidden = true;
  shootButton.disabled = true;
  if (flightLine) flightLine.visible = false;
  landingRing.visible = false;
  document.querySelector('.panel-live').innerHTML = '<i></i> 足球飞行中';
  summary.textContent = '足球飞行中，风和旋转正改变它的轨迹…';
}
function nextShot() {
  state.phase = 'ready'; state.shot = null;
  ball.position.set(0, FIELD.ballRadius, FIELD.startZ);
  ball.rotation.set(0, 0, 0);
  keeper.position.x = 0; keeper.rotation.z = 0;
  setWind();
  resultBanner.hidden = true;
  shootButton.hidden = false; shootButton.disabled = false;
  nextButton.hidden = true;
  document.querySelector('.panel-live').innerHTML = '<i></i> 准备射门';
  updatePreview();
}

let lastFrame = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state.phase === 'flying') {
    const shot = state.shot;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps && !shot.result; i++) {
      if (shot.time > .27) {
        const remaining = Math.max(0, (shot.z - FIELD.keeperZ) / -shot.vz);
        state.keeperTarget = THREE.MathUtils.clamp(shot.x + shot.vx * remaining, -1.8, 1.8);
      }
      const distance = state.keeperTarget - keeper.position.x;
      keeper.position.x += Math.sign(distance) * Math.min(Math.abs(distance), 3.4 * dt / steps);
      keeper.rotation.z = -THREE.MathUtils.clamp(distance * .12, -.22, .22);
      advanceShot(shot, dt / steps, keeper.position.x);
    }
    ball.position.set(shot.x, shot.y, shot.z);
    ball.rotation.x -= dt * 11; ball.rotation.z += dt * shot.side * 8;
    if (shot.result) finish(shot.result);
  }
  if (landingRing?.visible) landingRing.material.opacity = .52 + Math.sin(now * .006) * .22;
  renderer.render(scene, camera);
}

document.querySelectorAll('#contactPicker button').forEach(button => {
  button.addEventListener('click', () => {
    if (state.phase !== 'ready') return;
    document.querySelectorAll('#contactPicker button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    state.side = Number(button.dataset.side); state.height = Number(button.dataset.height);
    updatePreview();
  });
});
document.querySelector('#contactPicker [data-side="-1"][data-height="-1"]').classList.add('active');
aimInput.addEventListener('input', () => { state.aim = Number(aimInput.value); updatePreview(); });
powerInput.addEventListener('input', () => { state.power = Number(powerInput.value); updatePreview(); });
shootButton.addEventListener('click', startShot);
nextButton.addEventListener('click', nextShot);
$('resetButton').addEventListener('click', () => { state.shots = state.goals = 0; updateScore(); if (state.phase === 'finished') nextShot(); });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if (event.code === 'Space') { event.preventDefault(); startShot(); }
  if (state.phase === 'ready' && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
    event.preventDefault();
    state.aim = THREE.MathUtils.clamp(state.aim + (event.code === 'ArrowRight' ? .5 : -.5), -10, 10);
    aimInput.value = state.aim; updatePreview();
  }
});
setWind(); updatePreview(); updateScore();
