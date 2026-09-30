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
  // Preserve the approved jewelry rendering in an alpha atlas.
  let gemAtlas,matchBoard;
  function ensureGemAtlas() {
    if (gemAtlas) return;
    gemAtlas = new THREE.TextureLoader().load('../../classic/match-gems-atlas.png', undefined, undefined, error => {
      console.warn('Gem atlas unavailable; returning to the Canvas game view.', error);
      renderer.domElement.remove();
      delete window.PHDSXClassic3D;
    });
    gemAtlas.colorSpace = THREE.SRGBColorSpace;
  }
  function ensureMatchBoard() {
    if(matchBoard)return;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=570;
    const g=canvas.getContext('2d');
    const fillRound=(x,y,w,h,r,color)=>{g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()};
    const gradient=g.createLinearGradient(0,0,570,570);
    gradient.addColorStop(0,'#38204e');gradient.addColorStop(1,'#21112f');
    fillRound(1,1,568,568,18,gradient);
    g.strokeStyle='#c2a15c';g.lineWidth=2;g.beginPath();g.roundRect(2,2,566,566,17);g.stroke();
    g.strokeStyle='#70503a';g.lineWidth=1;g.beginPath();g.roundRect(6,6,558,558,14);g.stroke();
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const px=17+x*67,py=19+y*67;
      fillRound(px+1,py+1,65,65,6,'#473254');
      fillRound(px+3,py+3,61,61,5,'#150b23');
      g.strokeStyle='#2c1a3e';g.lineWidth=1;g.beginPath();g.roundRect(px+4,py+4,59,59,4);g.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    matchBoard=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));
    matchBoard.position.set(0,0,-.5);matchBoard.scale.set(570/40,570/40,1);scene.add(matchBoard);
  }
  function jewelPlane(type) {
    const geometry=new THREE.PlaneGeometry(1,1),uv=geometry.attributes.uv;
    const frames=[[82,56],[568,60],[1047,55],[82,539],[568,538],[1056,543]];
    const [left,top]=frames[type];
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=uv.getY(i);
      uv.setXY(i,(left+u*400)/1536,1-(top+(1-v)*400)/1024);
    }
    return geometry;
  }
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    ball: new THREE.SphereGeometry(1, 18, 12),
    cone: new THREE.ConeGeometry(.5, 1, 12),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
    torus: new THREE.TorusGeometry(.5, .07, 8, 24),
  };
  for(let i=0;i<6;i++)geo[`jewel${i}`]=jewelPlane(i);
  const meshes = [], jewels = [], sprites = [], textTextures = new Map();
  let meshIndex = 0, jewelIndex = 0, spriteIndex = 0;
  const ux = x => (x - 480) / 40, uy = y => (320 - y) / 40;
  function begin(color) {
    scene.background = new THREE.Color(color);
    meshIndex = jewelIndex = spriteIndex = 0;
    meshes.forEach(mesh => { mesh.visible = false; });
    jewels.forEach(mesh => { mesh.visible = false; });
    sprites.forEach(sprite => { sprite.visible = false; });
    if(matchBoard)matchBoard.visible=false;
  }
  function mesh(kind, x, y, z, w, h, d, color, angle = 0, glow = 0) {
    const isJewel=kind.startsWith('jewel');
    const pool=isJewel?jewels:meshes;
    let object=pool[isJewel?jewelIndex++:meshIndex++];
    if (!object) {
      object = new THREE.Mesh(geo[kind], isJewel
        ? new THREE.MeshBasicMaterial({map:gemAtlas,transparent:true,alphaTest:.02,depthWrite:false,toneMapped:false,side:THREE.DoubleSide})
        : new THREE.MeshStandardMaterial({ roughness: .38, metalness: .12 }));
      pool.push(object);
      scene.add(object);
    }
    if (object.userData.kind !== kind) {
      object.geometry = geo[kind];
      object.userData.kind = kind;
    }
    object.visible = true;
    delete object.userData.difference;
    delete object.userData.differenceMarker;
    object.position.set(ux(x), uy(y), z);
    object.scale.set(w / 40, h / 40, d / 40);
    object.rotation.set(0, 0, angle);
    object.material.color.set(isJewel?'#ffffff':color);
    if(!isJewel){object.material.emissive.set(color);object.material.emissiveIntensity=glow}
    return object;
  }
  const box = (x, y, w, h, d, color, z = 0, angle = 0) => mesh('box', x, y, z, w, h, d, color, angle);
  const ball = (x, y, rx, ry, rz, color, z = 0, glow = 0) => mesh('ball', x, y, z, rx, ry, rz, color, 0, glow);
  const cone = (x, y, w, h, d, color, z = 0, angle = 0) => mesh('cone', x, y, z, w, h, d, color, angle);
  const jewel = (x, y, w, h, type, z = 0) =>
    mesh(`jewel${type}`, x, y, z, w, h, 1, '#ffffff');
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
    ensureGemAtlas();
    ensureMatchBoard();
    begin('#1e1138');
    matchBoard.visible=true;
    const stage=s.animation,p=stage?Math.min(stage.elapsed/stage.duration,1):0;
    const ease=t=>1-Math.pow(1-t,3);
    const drawStone=(x,y,type,scale=1,selected=false)=>{
      if(scale<=.01)return;
      const px=212+(x+.5)*67,py=54+(y+.5)*67;
      const bob=selected?Math.sin(tick*6)*2:0;
      jewel(px,py-bob,65*scale,65*scale,type,selected?3.4:2);
      if(selected){
        const radius=30+Math.sin(tick*6)*.8;
        box(px,py-radius,60,2.4,2,'#ffe3a1',4);
        box(px,py+radius,60,2.4,2,'#ffe3a1',4);
        box(px-radius,py,2.4,60,2,'#ffe3a1',4);
        box(px+radius,py,2.4,60,2,'#ffe3a1',4);
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
  function differencePart(index, object) {
    object.userData.difference = index;
    return object;
  }
  function differenceScene(shift, variant) {
    const x = n => n + shift;
    box(x(237), 305, 455, 555, 8, '#b5e0ec', -5);
    differencePart(0, ball(x(94), 110, 34, 34, 8, variant ? '#f5ad60' : '#fff0a0', -3, .3));
    for (const [px, py, w] of [[176,355,260],[360,348,210]]) {
      cone(x(px), py, w, 235, 24, '#72958b', -3);
      cone(x(px), py - 89, 56, 47, 16, '#f2f6ef', -2.5);
    }
    box(x(237), 508, 455, 177, 15, '#76b67b', -2);
    box(x(280), 424, 210, 145, 27, '#edcfaa', 0);
    differencePart(1, box(x(280), 353, 245, 18, 30, variant ? '#a25e86' : '#ba5d57', 2));
    differencePart(1, line(x(163), 351, x(280), 273, 22, variant ? '#965777' : '#a84c4c', 2));
    differencePart(1, line(x(280), 273, x(397), 351, 22, variant ? '#965777' : '#a84c4c', 2));
    differencePart(4, box(x(276), 451, 46, 92, 8, variant ? '#70aecf' : '#755d50', 2));
    differencePart(4, ball(x(291), 450, 3, 3, 3, '#e7c469', 4));
    for (const px of [224, 344]) {
      box(x(px), 396, 42, 39, 7, '#eef5ee', 2);
      box(x(px), 396, 30, 27, 3, '#8ecbe5', 3);
      line(x(px), 382, x(px), 409, 3, '#f9f1db', 4);
    }
    box(x(85), 455, 19, 110, 16, '#74583d', 0);
    for (const [dx, dy, r] of [[-20,0,32],[17,-11,34],[-1,-34,30]])
      differencePart(2, ball(x(85 + dx), 400 + dy, r, r, 17, variant ? '#dca058' : '#61a66c', 1));
    differencePart(3, box(x(351), 475, 82, 17, 13, variant ? '#ed8ea4' : '#d5a45e', 2));
    box(x(321), 490, 8, 25, 10, '#766747', 1);
    box(x(381), 490, 8, 25, 10, '#766747', 1);
  }
  function drawDifference(s) {
    begin('#173149');
    differenceScene(0, false);
    differenceScene(480, true);
    box(480, 320, 16, 640, 18, '#263850', 5);
    const markers = [[94,110,42],[280,312,265,112],[85,388,64],[351,475,98,33],[276,451,62,108]];
    for (const i of s.found) for (const shift of [0, 480]) {
      const [x,y,w,h] = markers[i], parts = h
        ? [line(x-w/2+shift,y-h/2,x+w/2+shift,y-h/2,4,'#ffe17b',5),
           line(x-w/2+shift,y+h/2,x+w/2+shift,y+h/2,4,'#ffe17b',5),
           line(x-w/2+shift,y-h/2,x-w/2+shift,y+h/2,4,'#ffe17b',5),
           line(x+w/2+shift,y-h/2,x+w/2+shift,y+h/2,4,'#ffe17b',5)]
        : [ring(x+shift,y,w,'#ffe17b',5)];
      parts.forEach(part => { part.userData.differenceMarker = true; });
    }
  }
  let differencePicker;
  const drawByGame = {snake:drawSnake,plane:drawPlane,birds:drawBirds,match:drawMatch,stars:drawStars,difference:drawDifference};
  window.PHDSXClassic3D = {
    hitDifference(point) {
      differencePicker ||= new THREE.Raycaster();
      differencePicker.setFromCamera({x:point.x/480-1,y:1-point.y/320},camera);
      // Pick the frontmost visible surface. Markers must not obscure another
      // target, and scenery inside the roof outline must remain a miss.
      const hit = differencePicker.intersectObjects(meshes.filter(object => object.visible && !object.userData.differenceMarker),false)[0];
      return hit?.object.userData.difference ?? -1;
    },
    draw(game, model, tick) {
      try {
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
