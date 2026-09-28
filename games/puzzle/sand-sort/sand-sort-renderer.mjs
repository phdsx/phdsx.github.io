import * as THREE from '../../../assets/vendor/three.module.r160.js';
import { SAND_RADIUS, SAND_FLOOR, SAND_UNIT_HEIGHT, random01, getVisibleLayers, createSandSurface, stepGrain } from './sand-sort-physics.mjs';
export { getVisibleLayers } from './sand-sort-physics.mjs';
const PALETTE = { pink: '#e45f58', orange: '#e5ae43', blue: '#32a9dc', green: '#238a80', violet: '#8550d3', yellow: '#e1c477', cyan: '#65bcc3', red: '#b85963', lime: '#a7b87b', brown: '#ac805b' };
const BOTTLE_HEIGHT = 3.03, BOTTLE_WIDTH = 1.2;
const SHELVES = [0.489, 0.827];
const ease = t => t * t * (3 - 2 * t);
const clamp01 = t => Math.max(0, Math.min(1, t));

export function computeLayout(width, height, tubeCount) {
  const sceneWidth = Math.min(width, height * 9 / 16);
  const scene = { x: (width - sceneWidth) / 2, y: 0, width: sceneWidth, height };
  const columns = Math.max(1, Math.ceil(tubeCount / 2));
  const bottleWidth = Math.min(sceneWidth * 0.208, sceneWidth * 0.75 / columns, height * 0.268 / (BOTTLE_HEIGHT / BOTTLE_WIDTH));
  const bottleHeight = bottleWidth * BOTTLE_HEIGHT / BOTTLE_WIDTH;
  const bottles = Array.from({ length: tubeCount }, (_, index) => {
    const row = Math.floor(index / columns), count = Math.min(columns, tubeCount - row * columns);
    const spacing = sceneWidth * 0.78 / count;
    return { x: scene.x + sceneWidth / 2 + ((index % columns) - (count - 1) / 2) * spacing - bottleWidth / 2,
      y: SHELVES[row] * height - bottleHeight, width: bottleWidth, height: bottleHeight };
  });
  return { scene, columns, bottles, bottleWidth, bottleHeight };
}
export function hitTestBottle(layout, x, y) {
  const exact = layout.bottles.findIndex(box => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
  if (exact >= 0) return exact;
  let nearest = null, distance = Infinity;
  layout.bottles.forEach((box,index) => {
    if (x < box.x - 4 || x > box.x + box.width + 4 || y < box.y - 8 || y > box.y + box.height + 4) return;
    const candidate = (x - box.x - box.width / 2) ** 2 + (y - box.y - box.height / 2) ** 2;
    if (candidate < distance) { nearest = index; distance = candidate; }
  });
  return nearest;
}
export function getMotionSettings(reducedMotion) {
  return reducedMotion ? { pourDuration: 180, shakeDuration: 0, shakeAmplitude: 0, hintDuration: 0, hintPulses: 0 }
    : { pourDuration: 2300, shakeDuration: 240, shakeAmplitude: 0.035, hintDuration: 700, hintPulses: 2 };
}
export function tween(duration, paint, timing = {}) {
  const now = timing.now ?? (() => performance.now());
  const requestFrame = timing.requestFrame ?? (callback => requestAnimationFrame(callback));
  return new Promise((resolve, reject) => {
    const started = now();
    function tick(frameTime) {
      try {
        const progress = duration <= 0 ? 1 : clamp01((frameTime - started) / duration);
        paint(progress);
        if (progress < 1) requestFrame(tick); else resolve();
      } catch (error) { reject(error); }
    }
    requestFrame(tick);
  });
}
function makeBottleGeometry() {
  // The closed cross-section includes the outer wall, lip, inner wall and base.
  const curve = points => new THREE.SplineCurve(points.map(p => new THREE.Vector2(...p))).getPoints(48);
  const profile = [[0.001,0.015],[0.45,0.015],[0.55,0.045],[0.595,0.115],[0.6,0.24],[0.6,2.0]].map(p => new THREE.Vector2(...p));
  profile.push(...curve([[0.6,2.0],[0.599,2.14],[0.58,2.28],[0.51,2.39],[0.41,2.49],[0.33,2.6],[0.31,2.7]]));
  profile.push(...[[0.31,2.9],[0.34,2.92],[0.355,2.95],[0.355,3.005],[0.33,3.03],[0.285,3.03],[0.265,2.995],[0.265,2.7]].map(p => new THREE.Vector2(...p)));
  profile.push(...curve([[0.265,2.7],[0.282,2.6],[0.362,2.49],[0.462,2.38],[0.512,2.28],[0.534,2.14],[0.535,2.0]]));
  profile.push(...[[0.535,0.24],[0.5,0.17],[0.001,0.17]].map(p => new THREE.Vector2(...p)));
  const geometry = new THREE.LatheGeometry(profile, 96);
  geometry.computeVertexNormals(); return geometry;
}
function makeSandGeometry(bottom, top) {
  const segments = 64, rings = 10, positions = [], indices = [], uv = [];
  function disk(surface, upper) {
    const start = positions.length / 3;
    for (let ring = 0; ring <= rings; ring++) {
      const r = SAND_RADIUS * ring / rings;
      for (let i = 0; i <= segments; i++) {
        const theta = i / segments * Math.PI * 2, x = Math.cos(theta) * r, z = Math.sin(theta) * r;
        positions.push(x, surface.height(x, z), z); uv.push(x * 1.8 + 0.5, z * 1.8 + 0.5);
      }
    }
    for (let ring = 0; ring < rings; ring++) for (let i = 0; i < segments; i++) {
      const a = start + ring * (segments + 1) + i, b = a + segments + 1;
      if (upper) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  disk(top, true); disk(bottom, false);
  const start = positions.length / 3;
  for (let i = 0; i <= segments; i++) {
    const theta = i / segments * Math.PI * 2, x = Math.cos(theta) * SAND_RADIUS, z = Math.sin(theta) * SAND_RADIUS;
    positions.push(x, bottom.height(x, z), z, x, top.height(x, z), z);
    uv.push(i / segments * 3, bottom.height(x, z), i / segments * 3, top.height(x, z));
    if (i < segments) { const a = start + i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
function makeGrainTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = 90 + Math.floor(random01(i * 7.91) * 165); data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3); texture.needsUpdate = true; return texture;
}
function makeStudioEnvironment(renderer,backdrop) {
  const studio = new THREE.Scene(); studio.background = new THREE.Color('#273547');
  studio.add(new THREE.Mesh(new THREE.SphereGeometry(9,64,32),new THREE.MeshBasicMaterial({map:backdrop,side:THREE.BackSide})));
  const glow = new Uint8Array(32 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const nx = (x / 31 - 0.5) * 2, ny = (y / 63 - 0.5) * 2;
    const value = Math.round(255 * Math.exp(-nx * nx * 3.2 - ny * ny * 2.6));
    glow.set([value,value,value,255],(y * 32 + x) * 4);
  }
  const softbox = new THREE.DataTexture(glow,32,64); softbox.needsUpdate = true;
  function panel(color, intensity, x, y, z, width, height, soft = true) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color, map:soft ? softbox : null, toneMapped: false, side: THREE.DoubleSide }));
    mesh.material.color.multiplyScalar(intensity); mesh.position.set(x, y, z); mesh.lookAt(0, 0, 0); studio.add(mesh);
  }
  panel('#ffe1b5',3.5,-4,2,3,1.8,6); panel('#ecf5ff',2.5,4,2,2,1.1,6);
  panel('#e7f0ff',5.0,0,6,1,6,2); panel('#fff6ea',16.0,-2,3.5,5,2.3,2.2);
  panel('#ffeac8',2.3,-4,1,4,0.35,5,false);
  panel('#e0efff',1.6,4,1,3,0.24,5,false);
  const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromScene(studio, 0.025);
  pmrem.dispose(); softbox.dispose(); studio.traverse(obj => { if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); } }); return environment;
}
export function createRenderer(canvas, assets) {
  const webgl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  webgl.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2)); webgl.outputColorSpace = THREE.SRGBColorSpace;
  webgl.toneMapping = THREE.ACESFilmicToneMapping; webgl.toneMappingExposure = 1.12;
  const scene = new THREE.Scene(), backdrop = new THREE.Texture(assets.background);
  backdrop.colorSpace = THREE.SRGBColorSpace; backdrop.needsUpdate = true; scene.background = backdrop;
  const environment = makeStudioEnvironment(webgl,backdrop); scene.environment = environment.texture;
  const camera = new THREE.OrthographicCamera(-5,5,8,-8,0.1,100); camera.position.set(0,0,18);
  scene.add(new THREE.HemisphereLight('#f7e7cc','#3a3435',1.8));
  const warm = new THREE.DirectionalLight('#ffe1ae',2.0); warm.position.set(-4,8,7); scene.add(warm);
  const cool = new THREE.DirectionalLight('#b8d4ff',1.0); cool.position.set(5,3,6); scene.add(cool);
  const glassGeometry = makeBottleGeometry();
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color:'#ffffff', metalness:0, roughness:0.045, transmission:0.97,
    thickness:0.18, ior:1.52, envMapIntensity:1.85, clearcoat:1, clearcoatRoughness:0.04, side:THREE.FrontSide, depthWrite:false,
    attenuationColor:new THREE.Color('#f3e2c5'), attenuationDistance:8 });
  let detailGeometry, detailMaterial;
  if (assets.glassDetail) {
    const texture = new THREE.Texture(assets.glassDetail);
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    detailGeometry = glassGeometry.clone();
    const positions = detailGeometry.attributes.position;
    const uv = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) { uv[i*2] = (positions.getX(i) + 0.6) / 1.2; uv[i*2+1] = positions.getY(i) / BOTTLE_HEIGHT; }
    detailGeometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    detailMaterial = new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0.82,depthWrite:false,side:THREE.FrontSide,toneMapped:false});
  }
  const noiseTexture = assets.grains ? new THREE.Texture(assets.grains) : makeGrainTexture();
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.repeat.set(0.7,0.7); noiseTexture.needsUpdate = true;
  const grainColorTexture = noiseTexture.clone(); grainColorTexture.colorSpace = THREE.SRGBColorSpace; grainColorTexture.needsUpdate = true;
  const materials = Object.fromEntries(Object.entries(PALETTE).map(([id,color]) => [id,new THREE.MeshStandardMaterial({
    color, map:grainColorTexture, roughness:0.94, metalness:0, bumpMap:noiseTexture, bumpScale:0.045, side:THREE.DoubleSide })]));
  const models = [], baseGeometry = new THREE.TorusGeometry(0.545,0.028,8,96), lipGeometry = new THREE.TorusGeometry(0.316,0.026,8,64);
  const edgeMaterial = new THREE.MeshPhysicalMaterial({ color:'#f1e8d8',roughness:0.065,metalness:0,transmission:0.75,envMapIntensity:2.6,thickness:0.075,depthWrite:false });
  let layout = computeLayout(390,693,0), worldPerPixel = 10 / 390, lastSize = '';
  const streamCount = 1500, streamPositions = new Float32Array(streamCount * 3); streamPositions.fill(1000);
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute('position',new THREE.BufferAttribute(streamPositions,3).setUsage(THREE.DynamicDrawUsage));
  const streamMaterial = new THREE.PointsMaterial({ color:PALETTE.orange,size:1.2,sizeAttenuation:false,transparent:true,opacity:0.92,depthWrite:false });
  const stream = new THREE.Points(streamGeometry,streamMaterial); stream.renderOrder = 20; stream.frustumCulled = false; stream.visible = false; scene.add(stream);
  canvas.dataset.renderer = 'webgl-three-r160';
  function pixelToWorld(x,y) { return new THREE.Vector3((x-layout.scene.width/2)*worldPerPixel,(layout.scene.height/2-y)*worldPerPixel,0); }
  function createBottle(index) {
    const group = new THREE.Group(), body = new THREE.Mesh(glassGeometry,glassMaterial); body.position.y = -BOTTLE_HEIGHT/2; group.add(body);
    if (detailGeometry) {
      const detail = new THREE.Mesh(detailGeometry,detailMaterial); detail.position.y = -BOTTLE_HEIGHT/2;
      detail.scale.set(1.002,1,1.002); detail.renderOrder = 5; group.add(detail);
    }
    for (const [geometry,y] of [[baseGeometry,0.105],[lipGeometry,2.983]]) {
      const ring = new THREE.Mesh(geometry,y > 2 ? glassMaterial : edgeMaterial); ring.rotation.x = Math.PI/2; ring.position.y = y-BOTTLE_HEIGHT/2; group.add(ring);
    }
    const sand = new THREE.Group(); sand.position.y = -BOTTLE_HEIGHT/2; group.add(sand);
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.64,0.013,6,64),new THREE.MeshBasicMaterial({color:'#f4cf95',transparent:true,opacity:0.8}));
    marker.rotation.x = Math.PI/2; marker.position.y = -BOTTLE_HEIGHT/2+0.055; marker.visible = false; group.add(marker); scene.add(group);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:'#130d0a',transparent:true,opacity:0.34,depthWrite:false})); scene.add(shadow);
    const model = {group,sand,marker,shadow,stamp:'',base:new THREE.Vector3(),scale:1,top:null,index}; models.push(model); return model;
  }
  function resize(tubeCount) {
    const rect = canvas.getBoundingClientRect(), width = Math.max(1,rect.width), height = Math.max(1,rect.height);
    layout = computeLayout(width,height,tubeCount); worldPerPixel = 10/width;
    const size = `${width}:${height}`;
    if (size !== lastSize) {
      webgl.setSize(width,height,false); const worldHeight = height*worldPerPixel;
      camera.left = -5; camera.right = 5; camera.top = worldHeight/2; camera.bottom = -worldHeight/2; camera.updateProjectionMatrix(); lastSize = size;
    }
    while (models.length < tubeCount) createBottle(models.length);
    models.forEach((model,index) => {
      model.group.visible = model.shadow.visible = index < tubeCount; const box = layout.bottles[index]; if (!box) return;
      model.scale = box.width*worldPerPixel/BOTTLE_WIDTH; model.base.copy(pixelToWorld(box.x+box.width/2,box.y+box.height/2));
      model.group.scale.setScalar(model.scale); model.group.position.copy(model.base);
      model.shadow.position.copy(pixelToWorld(box.x+box.width/2,box.y+box.height-1)); model.shadow.position.z = -0.8;
      model.shadow.scale.set(box.width*worldPerPixel*0.47,box.width*worldPerPixel*0.045,1);
    }); return layout;
  }
  function updateSand(model,tube,effect = {}) {
    const layers = getVisibleLayers(tube,effect.removeUnits,effect.addColor,effect.addUnits), tilt = effect.tilt ?? null, mound = effect.mound ?? 0.095;
    const stamp = JSON.stringify([layers,tilt?.toFixed(3),mound.toFixed(3)]); if (stamp === model.stamp) return; model.stamp = stamp;
    for (const child of [...model.sand.children]) { model.sand.remove(child); child.geometry.dispose(); if (child.isPoints) child.material.dispose(); }
    let cumulative = 0, bottom = {height:() => SAND_FLOOR}; const grainPositions = [], grainColors = [];
    layers.forEach(({color,units},layerIndex) => {
      cumulative += units;
      const boundaryTilt = tilt ?? Math.sin(model.index * 1.2 + layerIndex * 3.5 + 0.6) * 0.28;
      const top = createSandSurface(SAND_FLOOR+cumulative*SAND_UNIT_HEIGHT,{tilt:boundaryTilt,mound:layerIndex === layers.length-1 ? mound : 0,seed:model.index*0.4,lowerSurface:bottom}); model.top = top;
      model.sand.add(new THREE.Mesh(makeSandGeometry(bottom,top),materials[color]));
      const count = Math.ceil(620*units);
      for (let i = 0; i < count; i++) {
        const seed = i+model.index*1337+layerIndex*891, angle = random01(seed*3.61)*Math.PI*2;
        const radius = i%3 === 0 ? SAND_RADIUS*Math.sqrt(random01(seed*1.81)) : SAND_RADIUS*1.001;
        const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius, low = bottom.height(x,z), high = top.height(x,z);
        const y = i%3 === 0 && layerIndex === layers.length-1 ? high+0.002 : low+(high-low)*random01(seed*5.13);
        if (high-low < 0.001) continue; grainPositions.push(x,y,z);
        const shade = new THREE.Color(PALETTE[color]).multiplyScalar(0.48+random01(seed*9.17)*0.65); grainColors.push(shade.r,shade.g,shade.b);
      } bottom = top;
    });
    if (grainPositions.length) {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(grainPositions,3)); geometry.setAttribute('color',new THREE.Float32BufferAttribute(grainColors,3));
      model.sand.add(new THREE.Points(geometry,new THREE.PointsMaterial({size:Math.max(0.5,model.scale*0.34),vertexColors:true,sizeAttenuation:false})));
    }
    if (!layers.length) model.top = {height:() => SAND_FLOOR};
  }
  function draw(frame,effects = {}) {
    frame.tubes.forEach((tube,index) => {
      const model = models[index]; model.group.position.copy(model.base); model.group.rotation.set(0.13,0,0);
      model.marker.visible = frame.selected === index && !frame.pendingMove;
      if (model.marker.visible) model.group.position.y += 0.12*model.scale;
      updateSand(model,tube,effects[index]);
    }); stream.visible = false; webgl.render(scene,camera);
  }
  async function animatePour(frame,plan) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { await tween(180,() => {}); return; }
    const source = models[plan.from], target = models[plan.to], direction = source.base.x < target.base.x ? -1 : 1, tilt = direction*1.33;
    // Give the standing bottles room while the source is lifted off its shelf.
    const sourceRow = Math.floor(plan.from / layout.columns);
    const standingRow = frame.tubes.map((_,index) => index).filter(index => index !== plan.from && Math.floor(index / layout.columns) === sourceRow);
    const restPositions = new Map();
    standingRow.forEach((index,position) => {
      const x = layout.scene.width / 2 + (position - (standingRow.length - 1) / 2) * layout.scene.width * 0.78 / standingRow.length;
      restPositions.set(index,new THREE.Vector3((x - layout.scene.width / 2) * worldPerPixel,models[index].base.y,0));
    });
    const mouthLocal = new THREE.Vector3(0,(2.99-BOTTLE_HEIGHT/2)*source.scale,0);
    const rotatedMouth = mouthLocal.clone().applyAxisAngle(new THREE.Vector3(0,0,1),tilt);
    const targetMouth = (restPositions.get(plan.to) || target.base).clone().add(new THREE.Vector3(0,(2.99-BOTTLE_HEIGHT/2)*target.scale,0));
    const finalCenter = targetMouth.clone().add(new THREE.Vector3(-direction*0.04,0.42*target.scale,0.12)).sub(rotatedMouth);
    streamMaterial.color.set(PALETTE[plan.color]); const grains = []; let previousTime = 0, emitted = 0;
    // Scene scale: an upright bottle is approximately 25 cm tall.
    const gravity = 9.81 * target.scale * BOTTLE_HEIGHT / 0.25;
    await tween(getMotionSettings(false).pourDuration,progress => {
      canvas.dataset.pourProgress = progress.toFixed(3);
      const arrival = ease(clamp01(progress/0.22)), departure = ease(clamp01((progress-0.87)/0.13)), travel = arrival*(1-departure);
      const pouring = clamp01((progress-0.22)/0.48), amount = plan.count*pouring;
      const received = plan.count * clamp01((progress-0.31)/0.48), rotation = tilt*travel;
      const mound = progress < 0.78 ? 0.27 : 0.075+0.195*(1-ease(clamp01((progress-0.78)/0.09)));
      frame.tubes.forEach((tube,index) => {
        const model = models[index]; model.group.position.copy(model.base); model.group.rotation.set(0.13,0,0); model.marker.visible = false;
        if (restPositions.has(index)) model.group.position.lerpVectors(model.base,restPositions.get(index),travel);
        model.shadow.position.x = model.group.position.x;
        updateSand(model,tube,index === plan.from ? {removeUnits:amount,tilt:rotation,mound:0.015} : index === plan.to ? {addColor:plan.color,addUnits:received,mound} : {});
      });
      source.group.position.lerpVectors(source.base,finalCenter,travel); source.group.rotation.set(0.13*(1-travel),0,rotation);
      source.shadow.material.opacity = 0.34*(1-travel); source.group.updateMatrixWorld(true);
      const emitter = source.group.localToWorld(new THREE.Vector3(-direction*0.18,2.94-BOTTLE_HEIGHT/2,0.02));
      const time = progress*2.3, dt = time-previousTime; previousTime = time;
      const desired = Math.floor(pouring*1100);
      while (emitted < desired) {
        const seed = emitted++; grains.push({x:emitter.x+(random01(seed*2.3)-0.5)*0.13,y:emitter.y,z:emitter.z+(random01(seed*3.7)-0.5)*0.1,
          vx:(targetMouth.x-emitter.x)*2.8+(random01(seed*4.1)-0.5)*0.24,vy:-0.7,vz:-emitter.z*0.7,age:0,freshStep:dt * random01(seed * 7.11)});
      }
      const collider = {x:target.group.position.x,z:0,gravity,radius:SAND_RADIUS*target.scale,height:(x,z) => target.group.position.y+(target.top.height(x/target.scale,z/target.scale)-BOTTLE_HEIGHT/2)*target.scale};
      streamPositions.fill(1000); let visible = 0;
      grains.forEach(grain => {
        stepGrain(grain,grain.freshStep ?? dt,collider); delete grain.freshStep;
        if (grain.age < 1.3 && (grain.contacts || 0) < 3 && visible < streamCount) streamPositions.set([grain.x,grain.y,grain.z],visible++*3);
      });
      stream.visible = visible > 0; streamGeometry.attributes.position.needsUpdate = true; webgl.render(scene,camera);
    }); source.shadow.material.opacity = 0.34; stream.visible = false;
    delete canvas.dataset.pourProgress;
  }
  async function shake(frame,index) {
    const motion = getMotionSettings(matchMedia('(prefers-reduced-motion: reduce)').matches); if (!motion.shakeDuration) return draw(frame);
    await tween(motion.shakeDuration,progress => { draw(frame); models[index].group.rotation.z = Math.sin(progress*Math.PI*8)*motion.shakeAmplitude*(1-progress); webgl.render(scene,camera); });
  }
  async function flashHint(frame,from,to) {
    const duration = getMotionSettings(matchMedia('(prefers-reduced-motion: reduce)').matches).hintDuration;
    await tween(duration,progress => { draw(frame); for (const index of [from,to]) { models[index].marker.visible = true; models[index].marker.material.opacity = 0.45+Math.sin(progress*Math.PI*4)*0.3; } webgl.render(scene,camera); });
  }
  async function celebrate(frame) { draw(frame); }
  return {resize,draw,animatePour,shake,flashHint,celebrate,getLayout:() => layout};
}
