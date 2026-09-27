import * as THREE from '../../assets/vendor/three.module.r160.js';

// The game rules and hit targets remain in classic.js. This layer renders the
// same 960 × 640 coordinate space with locally bundled Three.js geometry.
(() => {
  const holder = document.querySelector('.classic-canvas-wrap');
  if (!holder) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(960, 640, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch (error) {
    console.info('Three.js unavailable; using the Canvas game view.', error);
    return;
  }
  renderer.domElement.className = 'classic-3d';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  holder.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(-9, 12, 22);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8ba9ff, 0.35);
  fill.position.set(12, -5, 12);
  scene.add(fill);
  const jewelLight = new THREE.DirectionalLight(0xffffff, 1.1);
  jewelLight.position.set(4, 7, 18);
  scene.add(jewelLight);

  // Each stone has a crown, table, girdle and pavilion. Separate triangular
  // facets keep their hard edges under lighting and carry slight color shifts.
  function jewelOutline(type) {
    if (type === 2) return [[-.3,.48],[.3,.48],[.43,.34],[.43,-.34],[.3,-.48],[-.3,-.48],[-.43,-.34],[-.43,.34]].reverse();
    const count = type === 0 ? 12 : 16, outline=[];
    for (let i=0;i<count;i++) {
      const angle=i*Math.PI*2/count, sine=Math.sin(angle), cosine=Math.cos(angle);
      let x,y;
      if (type === 0) {
        x=Math.sign(sine)*Math.pow(Math.abs(sine),.72)*.46;
        y=Math.sign(cosine)*Math.pow(Math.abs(cosine),.72)*.46;
      } else if (type === 3) {
        x=sine*(.32+.13*(1-cosine)/2);y=cosine*.48;
      } else if (type === 4) {
        x=sine*.38;y=cosine*.48;
      } else if (type === 5) {
        x=Math.sign(sine)*Math.pow(Math.abs(sine),1.35)*.44;y=cosine*.48;
      } else {
        x=sine*.47;y=cosine*.47;
      }
      outline.push([x,y]);
    }
    return outline.reverse();
  }
  function jewelGeometry(type) {
    const outline=jewelOutline(type), positions=[], tints=[], count=outline.length;
    const emit=(a,b,c,light)=>{
      positions.push(...a,...b,...c);
      for(let i=0;i<3;i++)tints.push(light,light,light);
    };
    const point=(index,scale,z)=>[outline[index][0]*scale,outline[index][1]*scale,z];
    const table=type===2?.59:.46;
    for(let i=0;i<count;i++){
      const j=(i+1)%count,bright=.76+(i%4)*.07;
      emit(point(i,1,.02),point(j,1,.02),point(j,.75,.24),bright*.8);
      emit(point(i,1,.02),point(j,.75,.24),point(i,.75,.24),bright);
      emit(point(i,.75,.24),point(j,.75,.24),point(j,table,.34),.77+(i%3)*.09);
      emit(point(i,.75,.24),point(j,table,.34),point(i,table,.34),.9+(i%2)*.08);
      emit([0,0,.35],point(i,table,.34),point(j,table,.34),type===2?.96:.81+(i%4)*.06);
      emit(point(j,1,.02),point(i,1,.02),point(i,1,-.1),.55+(i%3)*.08);
      emit(point(j,1,.02),point(i,1,-.1),point(j,1,-.1),.6+(i%3)*.07);
      emit(point(i,1,-.1),point(j,1,-.1),point(j,.5,-.29),.48+(i%4)*.07);
      emit(point(i,1,-.1),point(j,.5,-.29),point(i,.5,-.29),.57+(i%3)*.07);
      emit(point(i,.5,-.29),point(j,.5,-.29),[0,0,-.42],.4+(i%5)*.05);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));
    geometry.computeVertexNormals();
    return geometry;
  }

  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    ball: new THREE.SphereGeometry(1, 18, 12),
    cone: new THREE.ConeGeometry(.5, 1, 12),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
    torus: new THREE.TorusGeometry(.5, .07, 8, 24),
  };
  for(let i=0;i<6;i++)geo[`jewel${i}`]=jewelGeometry(i);
  const meshes = [], jewels = [], sprites = [], textTextures = new Map();
  let meshIndex = 0, jewelIndex = 0, spriteIndex = 0;
  const ux = x => (x - 480) / 40, uy = y => (320 - y) / 40;
  function begin(color) {
    scene.background = new THREE.Color(color);
    meshIndex = jewelIndex = spriteIndex = 0;
    meshes.forEach(mesh => { mesh.visible = false; });
    jewels.forEach(mesh => { mesh.visible = false; });
    sprites.forEach(sprite => { sprite.visible = false; });
  }
  function mesh(kind, x, y, z, w, h, d, color, angle = 0, glow = 0) {
    const isJewel=kind.startsWith('jewel');
    const pool=isJewel?jewels:meshes;
    let object=pool[isJewel?jewelIndex++:meshIndex++];
    if (!object) {
      object = new THREE.Mesh(geo[kind], isJewel
        ? new THREE.MeshPhysicalMaterial({vertexColors:true,flatShading:true,roughness:.07,metalness:.05,clearcoat:1,clearcoatRoughness:.04,transmission:.08,thickness:.5,side:THREE.DoubleSide})
        : new THREE.MeshStandardMaterial({ roughness: .38, metalness: .12 }));
      pool.push(object);
      scene.add(object);
    }
    if (object.userData.kind !== kind) {
      object.geometry = geo[kind];
      object.userData.kind = kind;
    }
    object.visible = true;
    object.position.set(ux(x), uy(y), z);
    object.scale.set(w / 40, h / 40, d / 40);
    object.rotation.set(0, 0, angle);
    object.material.color.set(color);
    object.material.emissive.set(color);
    object.material.emissiveIntensity = glow;
    return object;
  }
  const box = (x, y, w, h, d, color, z = 0, angle = 0) => mesh('box', x, y, z, w, h, d, color, angle);
  const ball = (x, y, rx, ry, rz, color, z = 0, glow = 0) => mesh('ball', x, y, z, rx, ry, rz, color, 0, glow);
  const cone = (x, y, w, h, d, color, z = 0, angle = 0) => mesh('cone', x, y, z, w, h, d, color, angle);
  const jewel = (x, y, w, h, type, color, z = 0, angle = 0, glow = 0) =>
    mesh(`jewel${type}`, x, y, z, w, h, 22, color, angle, glow);
  const ring = (x, y, r, color, z = 1) => mesh('torus', x, y, z, r * 2, r * 2, r * 2, color, 0, .35);
  function line(x1, y1, x2, y2, width, color, z = 1) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    return mesh('cylinder', (x1 + x2) / 2, (y1 + y2) / 2, z, width, len, width, color,
      Math.atan2(-(y2 - y1), x2 - x1) - Math.PI / 2);
  }
  function text(value, x, y, size = 22) {
    const key = String(value);
    let texture = textTextures.get(key);
    if (!texture) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#132749';
      g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f6d581'; g.lineWidth = 7; g.stroke();
      g.fillStyle = '#fffaf0'; g.font = '800 68px system-ui';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(key, 64, 69);
      texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      textTextures.set(key, texture);
    }
    let sprite = sprites[spriteIndex++];
    if (!sprite) {
      sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      sprites.push(sprite); scene.add(sprite);
    }
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
    sprite.visible = true;
    sprite.position.set(ux(x), uy(y), 5);
    sprite.scale.set(size / 40, size / 40, 1);
  }
  function ground(color, top = 550) {
    box(480, (top + 640) / 2, 960, 640 - top, 28, color, -2);
    box(480, top, 960, 8, 16, '#d2dbaa', -.5);
  }
  function scatter(count, tick, color = '#d1e8ff') {
    for (let i = 0; i < count; i++) {
      const x = (i * 173 + 81) % 960, y = (i * 293 + 47) % 620;
      ball(x, y, i % 7 ? 1.5 : 3, i % 7 ? 1.5 : 3, 2, color, -2, .55 + Math.sin(tick * 2 + i) * .15);
    }
  }
  function drawSnake(s) {
    begin('#0c2431');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++)
      box(x * 40 + 20, y * 40 + 20, 39, 39, 8, (x + y) % 2 ? '#16444b' : '#1c5256', -2);
    const fx = s.food.x * 40 + 20, fy = s.food.y * 40 + 20;
    ball(fx, fy, 15, 16, 16, '#f43f5e', 2);
    line(fx, fy - 17, fx + 3, fy - 26, 4, '#6a432f', 3);
    ball(fx + 8, fy - 22, 8, 4, 3, '#61bd5f', 3);
    s.body.slice().reverse().forEach((p, j) => {
      const head = j === s.body.length - 1, x = p.x * 40 + 20, y = p.y * 40 + 20;
      ball(x, y, head ? 20 : 18, head ? 20 : 18, 14, head ? '#8cedac' : j % 2 ? '#42c981' : '#50da91', 2);
      if (head) {
        const dx = s.dir.x, dy = s.dir.y;
        ball(x + dx * 8 - dy * 7, y + dy * 8 + dx * 7, 3.5, 3.5, 3, '#142c30', 3.2);
        ball(x + dx * 8 + dy * 7, y + dy * 8 - dx * 7, 3.5, 3.5, 3, '#142c30', 3.2);
      }
    });
  }
  function aircraft(x, y, color, enemy = false) {
    const dir = enemy ? -1 : 1;
    cone(x, y - 24 * dir, 28, 28, 24, color, 2, enemy ? Math.PI : 0);
    box(x, y, 23, 58, 23, color, 1.5);
    box(x, y + 8 * dir, 77, 13, 11, color, 1);
    box(x, y + 24 * dir, 42, 9, 12, color, 1);
    ball(x, y - 7 * dir, 9, 16, 8, enemy ? '#ffd8ae' : '#b9f0ff', 4, .12);
    for (const dx of [-27, 27]) ball(x + dx, y + 10 * dir, 6, 8, 8, '#d4e5ee', 2);
  }
  function drawPlane(s, tick) {
    begin('#0a1d3d');
    scatter(75, tick, '#b8d9ff');
    for (let i = 0; i < 5; i++) {
      const x = (i * 247 + 95) % 960, y = (i * 173 + tick * 28) % 760 - 70;
      ball(x, y, 70, 15, 5, '#38577d', -3);
    }
    s.shots.forEach(b => { ball(b.x, b.y, 5, 15, 5, '#fff5a5', 4, .8); });
    s.enemies.forEach(e => aircraft(e.x, e.y, '#e96c75', true));
    if (s.inv <= 0 || Math.floor(tick * 12) % 2 === 0) aircraft(s.x, s.y, '#4dccdf');
  }
  function tankModel(x, y, color, dir = { x: 0, y: -1 }) {
    box(x - 17, y, 12, 45, 16, '#232e37', 1);
    box(x + 17, y, 12, 45, 16, '#232e37', 1);
    for (const dx of [-17, 17]) for (const dy of [-14, 0, 14]) ball(x + dx, y + dy, 5, 5, 6, '#879099', 2);
    box(x, y, 33, 37, 18, color, 2);
    ball(x, y, 13, 13, 12, '#d8e6c2', 3);
    const ex = x + dir.x * 30, ey = y + dir.y * 30;
    line(x, y, ex, ey, 9, '#cad8b4', 4);
    ball(x, y, 7, 7, 6, '#364b43', 4.5);
  }
  function drawTank(s) {
    begin('#193b32');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++)
      box(x * 80 + 40, y * 80 + 40, 79, 79, 8, (x + y) % 2 ? '#416d50' : '#3c624a', -3);
    for (const wall of [{x:185,y:120,w:95,h:45},{x:410,y:90,w:140,h:45},{x:665,y:165,w:110,h:45},{x:130,y:360,w:110,h:45},{x:395,y:330,w:160,h:42},{x:695,y:390,w:95,h:45}]) {
      box(wall.x + wall.w / 2, wall.y + wall.h / 2, wall.w, wall.h, 22, '#ab7863', 1);
      for (let x = wall.x + 14; x < wall.x + wall.w - 5; x += 30) box(x, wall.y + 10, 3, 18, 3, '#e9b08a', 3);
    }
    s.bullets.forEach(b => ball(b.x, b.y, 7, 7, 7, b.own ? '#ffdc72' : '#ff867a', 5, .5));
    s.enemies.forEach(e => tankModel(e.x, e.y, '#b75a54', {x:0,y:1}));
    tankModel(s.x, s.y, '#89bf72', s.dir);
    box(480, 618, 75, 28, 18, '#c7b779', 1);
    text('★', 480, 615, 31);
  }
  function pig(x, y) {
    ball(x, y, 28, 28, 25, '#9bd35d', 2);
    ball(x - 18, y - 22, 9, 11, 8, '#a4de69', 2);
    ball(x + 18, y - 22, 9, 11, 8, '#a4de69', 2);
    ball(x, y + 9, 13, 11, 8, '#c2e784', 4);
    for (const dx of [-8, 8]) {
      ball(x + dx, y - 6, 4, 5, 4, '#172d22', 4.5);
      ball(x + dx * .55, y + 9, 2.5, 3, 2, '#416b3f', 5);
    }
  }
  function bird(x, y) {
    ball(x, y, 21, 21, 20, '#e54e4f', 3);
    ball(x + 7, y - 6, 8, 8, 5, '#fff7e6', 5);
    ball(x + 9, y - 6, 3, 3, 3, '#1d2530', 6);
    cone(x + 22, y + 3, 16, 21, 12, '#ffc25b', 5, -Math.PI / 2);
    line(x + 1, y - 15, x + 16, y - 13, 4, '#59282d', 6);
  }
  function drawBirds(s, tick) {
    begin('#99d6ee');
    ball(820, 105, 52, 52, 14, '#fff4c4', -5, .3);
    for (const [x, y, r] of [[140,390,190],[500,410,240],[830,430,210]]) ball(x, y, r, 110, 20, '#a7cfaa', -5);
    ground('#76b85d', 560);
    box(744, 552, 205, 20, 26, '#8f6547', 1);
    box(735, 500, 40, 90, 25, '#aa764a', 1);
    box(740, 469, 135, 16, 24, '#bc8a50', 2);
    s.targets.forEach(t => { if (!t.hit) pig(t.x, t.y); });
    line(166, 565, 166, 466, 13, '#7d5138', 2);
    line(205, 565, 205, 459, 13, '#7d5138', 2);
    const p = s.drag || {x:180,y:490};
    line(166, 466, p.x, p.y, 5, '#503c31', 3);
    line(205, 459, p.x, p.y, 5, '#503c31', 3);
    if (s.bird) bird(s.bird.x, s.bird.y);
    else if (s.shots) bird(p.x, p.y + Math.sin(tick * 2) * 1.5);
  }
  function drawMatch(s, tick) {
    begin('#21183f');
    box(480, 320, 570, 570, 26, '#554787', -2);
    const colors = ['#ed275d','#35bfff','#ffc92f','#62db24','#ac53e8','#ff8a22'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const px = 212 + x * 67 + 33.5, py = 54 + y * 67 + 33.5;
      box(px, py, 63, 63, 10, (x + y) % 2 ? '#282146' : '#302650', -.5);
    }
    const stage=s.animation,p=stage?Math.min(stage.elapsed/stage.duration,1):0;
    const ease=t=>1-Math.pow(1-t,3);
    const drawStone=(x,y,type,scale=1,selected=false)=>{
      if(scale<=.01)return;
      const px=212+(x+.5)*67,py=54+(y+.5)*67;
      const bob=selected?Math.sin(tick*6)*2:0;
      const shapeAngle=type===5?-.52:0;
      jewel(px,py-bob,49*scale*(type===2?.94:1),49*scale,type,colors[type],selected?3.4:2,shapeAngle+(selected?Math.sin(tick*3)*.07:0),selected?.2:.06);
      if(selected){
        ring(px,py,29+Math.sin(tick*6)*1.7,'#ffe3a1',3.8);
        ball(px-22,py-23,2.4,2.4,3,'#fff7c8',4.2,.5);
      }
    };
    if(stage?.type==='fall'){
      for(const piece of stage.pieces){
        const travel=ease(p),y=piece.fromY+(piece.toY-piece.fromY)*travel;
        const landing=1+.08*Math.sin(Math.PI*Math.max(0,(p-.72)/.28));
        drawStone(piece.x,y,piece.color,landing);
      }
    }else{
      const board=stage?.before||s.board;
      for(let y=0;y<8;y++)for(let x=0;x<8;x++){
        const type=board[y][x];if(type<0)continue;
        let px=x,py=y,scale=1;
        if(stage?.type==='swap'){
          if(x===stage.a.x&&y===stage.a.y){px=x+(stage.b.x-x)*ease(p);py=y+(stage.b.y-y)*ease(p)}
          if(x===stage.b.x&&y===stage.b.y){px=x+(stage.a.x-x)*ease(p);py=y+(stage.a.y-y)*ease(p)}
          if((x===stage.a.x&&y===stage.a.y)||(x===stage.b.x&&y===stage.b.y))scale=1+.13*Math.sin(Math.PI*p);
        }else if(stage?.type==='clear'&&stage.cells.includes(`${x},${y}`)){
          scale=Math.max(0,1+.2*Math.sin(Math.PI*p)-ease(p));
          if(p<.78){
            ring(212+(x+.5)*67,54+(y+.5)*67,21+p*15,'#fff0b1',3.5);
            if(p>.25)for(let i=0;i<4;i++){
              const angle=i*Math.PI/2+tick*2,r=14+p*27;
              ball(212+(x+.5)*67+Math.cos(angle)*r,54+(y+.5)*67+Math.sin(angle)*r,2.2,2.2,2,'#fff8d8',4,.65);
            }
          }
        }
        const selected=!stage&&s.selected?.x===x&&s.selected.y===y;
        drawStone(px,py,type,scale*(selected?1.07:1),selected);
      }
    }
    for (let i = 0; i < 11; i++) ball(74 + i * 82, 607, 3, 3, 2, colors[i % colors.length], 1,.45);
  }
  function drawStars(s, tick) {
    begin('#0b1034');
    scatter(115, tick, '#a9c6ff');
    for (let i = 0; i < s.next - 1; i++) {
      const a = s.points[i], b = s.points[i+1];
      line(a[0], a[1], b[0], b[1], 5, '#ffe19a', 1.5);
    }
    s.points.forEach((p, i) => {
      const active = i < s.next, r = active ? 20 : 16;
      ball(p[0], p[1], r + 11, r + 11, 3, active ? '#d3b474' : '#486fba', 0, .18);
      ball(p[0], p[1], r, r, 16, active ? '#ffda87' : '#a3d4ff', 2, .35);
      ring(p[0], p[1], r + 8, active ? '#ffe4ad' : '#7da8ee', 1.5);
      text(i + 1, p[0], p[1] - 39, 29);
    });
  }
  function differenceScene(shift, variant) {
    const x = n => n + shift;
    box(x(237), 305, 455, 555, 8, '#b5e0ec', -5);
    ball(x(94), 110, 34, 34, 8, variant ? '#f5ad60' : '#fff0a0', -3, .3);
    for (const [px, py, w] of [[176,355,260],[360,348,210]]) {
      cone(x(px), py, w, 235, 24, '#72958b', -3);
      cone(x(px), py - 89, 56, 47, 16, '#f2f6ef', -2.5);
    }
    box(x(237), 508, 455, 177, 15, '#76b67b', -2);
    box(x(280), 424, 210, 145, 27, '#edcfaa', 0);
    box(x(280), 353, 245, 18, 30, variant ? '#a25e86' : '#ba5d57', 2);
    line(x(163), 351, x(280), 273, 22, variant ? '#965777' : '#a84c4c', 2);
    line(x(280), 273, x(397), 351, 22, variant ? '#965777' : '#a84c4c', 2);
    box(x(276), 451, 46, 92, 8, variant ? '#70aecf' : '#755d50', 2);
    ball(x(291), 450, 3, 3, 3, '#e7c469', 4);
    for (const px of [224, 344]) {
      box(x(px), 396, 42, 39, 7, '#eef5ee', 2);
      box(x(px), 396, 30, 27, 3, '#8ecbe5', 3);
      line(x(px), 382, x(px), 409, 3, '#f9f1db', 4);
    }
    box(x(85), 455, 19, 110, 16, '#74583d', 0);
    for (const [dx, dy, r] of [[-20,0,32],[17,-11,34],[-1,-34,30]])
      ball(x(85 + dx), 400 + dy, r, r, 17, variant ? '#dca058' : '#61a66c', 1);
    box(x(351), 475, 82, 17, 13, variant ? '#ed8ea4' : '#d5a45e', 2);
    box(x(321), 490, 8, 25, 10, '#766747', 1);
    box(x(381), 490, 8, 25, 10, '#766747', 1);
  }
  function drawDifference(s) {
    begin('#173149');
    differenceScene(0, false);
    differenceScene(480, true);
    box(480, 320, 16, 640, 18, '#263850', 5);
    const positions = [[95,110,38],[250,320,42],[104,402,36],[350,480,38],[276,445,39]];
    for (const i of s.found) for (const shift of [0, 480])
      ring(positions[i][0] + shift, positions[i][1], positions[i][2], '#ffe17b', 5);
  }
  const drawByGame = {snake:drawSnake,plane:drawPlane,tank:drawTank,birds:drawBirds,match:drawMatch,stars:drawStars,difference:drawDifference};
  window.PHDSXClassic3D = {
    draw(game, model, tick) {
      try {
        jewelLight.intensity=game==='match'?1.1:0;
        drawByGame[game](model, tick);
        renderer.render(scene, camera);
      } catch (error) {
        console.warn('Three.js render failed; returning to the Canvas game view.', error);
        renderer.domElement.remove();
        delete window.PHDSXClassic3D;
      }
    }
  };
})();
