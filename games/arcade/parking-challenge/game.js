(() => {
  'use strict';
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['level-label','level-name','time','collisions','best','hint','parking-status','overlay','overlay-title','overlay-message','overlay-action','pause','restart','sound'].map(id => [id, document.getElementById(id)]));
  const W = 900, H = 600, CAR_L = 76, CAR_W = 38;
  const PI = Math.PI;
  const keyMap = {ArrowUp:'forward',KeyW:'forward',ArrowDown:'reverse',KeyS:'reverse',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  const held = new Set();
  const colors = ['#69b5a0','#e4ad65','#7a9bd4','#c97675','#9d86ca','#a7b6bd'];
  const levels = [
    ['直线倒库','沿着车位轴线缓慢倒入，松开按键停稳。','straight',245,430,70,112,245,245,0,42],
    ['侧方停车','先驶到车位旁，再倒车调整车身。','parallel',430,465,120,68,480,300,0,54],
    ['狭窄车位','两侧都有车，转向要更轻。','straight',520,430,64,108,520,235,0,54],
    ['绕开路障','避开中间的隔离墩，找到入库路线。','straight',330,430,70,112,635,325,1,65],
    ['路边车位','从车流旁切入，完成侧方停车。','parallel',565,465,116,64,310,300,1,65],
    ['夜间倒库','车位更窄，慢一点就能看清边界。','straight',690,430,62,104,690,225,0,68],
    ['双车夹位','两辆车之间只有一个空位。','parallel',430,465,108,62,530,300,0,72],
    ['隔离墙','绕过隔离墙后再对齐车位。','straight',245,430,62,102,675,330,2,78],
    ['紧凑侧方','车位变浅，入位后仔细回正。','parallel',565,465,106,61,400,300,1,78],
    ['曲折通道','车位前方的路障增加了转弯难度。','straight',520,430,60,100,240,260,3,82],
    ['精细倒库','小车位需要更准确的方向与位置。','straight',330,430,56,96,330,250,0,88],
    ['极窄侧方','车头车尾都要留出足够空间。','parallel',430,465,100,58,535,300,0,90],
    ['双柱入口','留意两根立柱，慢速通过。','straight',690,430,56,96,435,240,4,92],
    ['终点前夜','绕过车位前的障碍，再顺直入库。','straight',520,430,56,94,250,310,3,95],
    ['停车大师','最后一个紧凑侧方车位，保持耐心。','parallel',565,465,98,58,340,290,2,98]
  ].map(([name,hint,layout,x,y,w,h,sx,sy,variant,par],index) => ({name,hint,layout,spot:{x,y,w:layout==='straight'?h:w,h:layout==='straight'?w:h,a:layout==='straight'?-PI/2:0},start:{x:sx,y:sy,a:layout==='straight'?-PI/2:0},variant,par,index}));

  let levelIndex = 0, level, car, obstacles = [], spaces = [], mode = 'intro';
  let elapsed = 0, collisions = 0, parkedFor = 0, contactCooldown = 0, lastFrame = 0, soundOn = true, audio = null;
  const saved = (() => { try { return JSON.parse(localStorage.getItem('phdsx-parking-challenge-v1')) || {}; } catch { return {}; } })();
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const angleDiff = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const rounded = (x,y,w,h,r) => { ctx.beginPath();ctx.roundRect(x,y,w,h,r); };

  function configure(index) {
    levelIndex = index;
    level = levels[index];
    car = {...level.start,v:0};
    elapsed = 0; collisions = 0; parkedFor = 0; contactCooldown = 0;
    held.clear();
    buildScene();
    ui['level-label'].textContent = `${String(index+1).padStart(2,'0')} / ${levels.length}`;
    ui['level-name'].textContent = level.name;
    ui.hint.textContent = level.hint;
    ui.best.textContent = saved[index]?.time ? `${saved[index].time.toFixed(1)}s · ${'★'.repeat(saved[index].stars)}` : '—';
    updateHud();
    draw();
  }

  function buildScene() {
    obstacles = [];
    spaces = [];
    for (let i=0;i<7;i++) {
      const x=103+i*112;
      spaces.push({x,y:145,w:96,h:160});
      if (![1,4].includes(i)) obstacles.push({type:'car',x,y:145,w:87,h:48,a:-PI/2,color:colors[(i+levelIndex)%colors.length]});
    }
    if (level.layout === 'straight') {
      const targetSlot = Math.round((level.spot.x-103)/112);
      for (let i=0;i<7;i++) {
        const x=level.spot.x+(i-targetSlot)*112;
        spaces.push({x,y:430,w:96,h:156});
        if (i!==targetSlot && ![0,6].includes(i)) obstacles.push({type:'car',x,y:430,w:87,h:48,a:-PI/2,color:colors[(i+levelIndex+3)%colors.length]});
      }
    } else {
      for (let i=-2;i<=2;i++) {
        spaces.push({x:level.spot.x+i*120,y:465,w:120,h:100});
      }
      obstacles.push({type:'car',x:level.spot.x-120,y:465,w:76,h:38,a:0,color:'#9b8ac6'});
      obstacles.push({type:'car',x:level.spot.x+120,y:465,w:76,h:38,a:0,color:'#ca846d'});
    }
    if (level.variant===1) obstacles.push({type:'wall',x:450,y:338,w:105,h:16,a:0});
    if (level.variant===2) obstacles.push({type:'wall',x:440,y:350,w:155,h:17,a:0});
    if (level.variant===3) {obstacles.push({type:'wall',x:375,y:335,w:120,h:16,a:0});obstacles.push({type:'cone',x:630,y:328,r:14});}
    if (level.variant===4) {obstacles.push({type:'cone',x:630,y:346,r:14});obstacles.push({type:'cone',x:750,y:346,r:14});}
  }

  function vertices(o) {
    const a=o.a||0, c=Math.cos(a),s=Math.sin(a), hx=o.w/2,hy=o.h/2;
    return [[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]].map(([x,y]) => ({x:o.x+x*c-y*s,y:o.y+x*s+y*c}));
  }
  function overlap(a,b) {
    const av=vertices(a),bv=vertices(b);
    for (const poly of [av,bv]) for(let i=0;i<4;i++) {
      const p=poly[i],q=poly[(i+1)%4],nx=q.y-p.y,ny=p.x-q.x;
      const pa=av.map(v=>v.x*nx+v.y*ny),pb=bv.map(v=>v.x*nx+v.y*ny);
      if (Math.max(...pa)<Math.min(...pb) || Math.max(...pb)<Math.min(...pa)) return false;
    }
    return true;
  }
  function blocked() {
    const body={...car,w:CAR_L-4,h:CAR_W-4};
    if (vertices(body).some(p=>p.x<22||p.x>W-22||p.y<22||p.y>H-22)) return true;
    return obstacles.some(o=>o.type==='cone' ? overlap(body,{x:o.x,y:o.y,w:22,h:22,a:0}) : overlap(body,o));
  }
  function inSpot() {
    const s=level.spot,c=Math.cos(s.a),sn=Math.sin(s.a);
    const aligned=Math.abs(angleDiff(car.a,s.a))<.15 || Math.abs(Math.abs(angleDiff(car.a,s.a))-PI)<.15;
    if(!aligned) return false;
    return vertices({x:car.x,y:car.y,w:CAR_L,h:CAR_W,a:car.a}).every(p=>{
      const dx=p.x-s.x,dy=p.y-s.y;
      return Math.abs(dx*c+dy*sn)<s.w/2-2 && Math.abs(-dx*sn+dy*c)<s.h/2-2;
    });
  }
  function update(dt) {
    if (mode!=='playing') return;
    elapsed+=dt;
    contactCooldown=Math.max(0,contactCooldown-dt);
    const drive=(held.has('forward')?1:0)-(held.has('reverse')?1:0);
    const steer=(held.has('right')?1:0)-(held.has('left')?1:0);
    if(drive) car.v=clamp(car.v+drive*175*dt,-125,170);
    else car.v*=Math.pow(.025,dt);
    if(Math.abs(car.v)<.3) car.v=0;
    const before={x:car.x,y:car.y,a:car.a};
    car.a+=steer*(car.v/170)*1.65*dt;
    car.x+=Math.cos(car.a)*car.v*dt;
    car.y+=Math.sin(car.a)*car.v*dt;
    if(blocked()) {
      Object.assign(car,before);
      car.v*=-.16;
      if(contactCooldown===0){collisions++;contactCooldown=.7;playTone(130,.085,'sawtooth');}
    }
    const inside=inSpot();
    if(inside && Math.abs(car.v)<7) parkedFor+=dt;
    else parkedFor=0;
    ui['parking-status'].textContent=inside ? parkedFor>0 ? `停稳中 ${Math.round(clamp(parkedFor,0,1)*100)}%` : '已入位，松开方向键' : '寻找车位';
    if(parkedFor>=1) complete();
    updateHud();
  }
  function updateHud(){ui.time.textContent=`${elapsed.toFixed(1)}s`;ui.collisions.textContent=collisions;}
  function playTone(freq,duration,type='sine') {
    if(!soundOn) return;
    try {
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      const o=audio.createOscillator(),g=audio.createGain();
      o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    } catch {}
  }
  function complete() {
    mode='won'; held.clear(); car.v=0;
    const stars=collisions===0&&elapsed<=level.par?3:collisions<=2&&elapsed<=level.par*1.8?2:1;
    if(!saved[levelIndex]||stars>saved[levelIndex].stars||(stars===saved[levelIndex].stars&&elapsed<saved[levelIndex].time)) {
      saved[levelIndex]={time:elapsed,stars};
      try{localStorage.setItem('phdsx-parking-challenge-v1',JSON.stringify(saved));}catch{}
    }
    ui.best.textContent=`${saved[levelIndex].time.toFixed(1)}s · ${'★'.repeat(saved[levelIndex].stars)}`;
    playTone(620,.16);setTimeout(()=>playTone(830,.3),140);
    showOverlay(`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} 停车成功`,`${level.name}完成！用时 ${elapsed.toFixed(1)} 秒，碰撞 ${collisions} 次。${levelIndex===levels.length-1?'你已经完成全部 15 关。':'准备好继续挑战下一关了吗？'}`,levelIndex===levels.length-1?'再玩一次':'下一关 →');
  }
  function showOverlay(title,message,button){ui['overlay-title'].textContent=title;ui['overlay-message'].textContent=message;ui['overlay-action'].textContent=button;ui.overlay.hidden=false;}
  function hideOverlay(){ui.overlay.hidden=true;}
  function restart(){configure(levelIndex);mode='playing';hideOverlay();ui.pause.innerHTML='Ⅱ <span>暂停</span>';}
  function pause(){if(mode==='playing'){mode='paused';held.clear();car.v=0;showOverlay('已暂停','休息一下。继续后仍从当前关卡的位置开始。','继续游戏');ui.pause.innerHTML='▶ <span>继续</span>';}else if(mode==='paused'){mode='playing';hideOverlay();ui.pause.innerHTML='Ⅱ <span>暂停</span>';}}

  function fillRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function drawBackground() {
    fillRect(0,0,W,H,'#354651');
    ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;
    for(let x=0;x<W;x+=35){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle='#f0f5df30';ctx.lineWidth=4;ctx.strokeRect(20,20,W-40,H-40);
    ctx.setLineDash([14,16]);ctx.lineWidth=2;ctx.strokeStyle='#e9ecc547';ctx.beginPath();ctx.moveTo(40,350);ctx.lineTo(860,350);ctx.stroke();ctx.setLineDash([]);
    for(const s of spaces){ctx.fillStyle='#111d2840';ctx.fillRect(s.x-s.w/2,s.y-s.h/2,s.w,s.h);ctx.strokeStyle='#d9e7e175';ctx.lineWidth=2;ctx.strokeRect(s.x-s.w/2,s.y-s.h/2,s.w,s.h);}
    const s=level.spot;
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.fillStyle='#66d99836';ctx.fillRect(-s.w/2,-s.h/2,s.w,s.h);ctx.strokeStyle='#80e7a1';ctx.lineWidth=4;ctx.strokeRect(-s.w/2,-s.h/2,s.w,s.h);ctx.strokeStyle='#a7ffba8c';ctx.setLineDash([8,6]);ctx.lineWidth=1.5;ctx.strokeRect(-s.w/2+7,-s.h/2+7,s.w-14,s.h-14);ctx.setLineDash([]);ctx.rotate(-s.a);ctx.fillStyle='#adf4b9';ctx.font='900 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('P',0,0);ctx.restore();
    ctx.fillStyle='#101b27ae';rounded(29,29,165,31,15);ctx.fill();ctx.fillStyle='#d8eadc';ctx.font='700 13px system-ui';ctx.textAlign='left';ctx.fillText(`第 ${levelIndex+1} 关  ·  ${level.name}`,43,50);
  }
  function drawCar(o,player=false) {
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a||0);
    const w=o.w||CAR_L,h=o.h||CAR_W;
    ctx.fillStyle='#0d1925aa';rounded(-w/2+3,-h/2+5,w,h,8);ctx.fill();
    ctx.fillStyle='#111c27';ctx.fillRect(-w*.30,-h*.58,w*.17,h*.16);ctx.fillRect(w*.14,-h*.58,w*.17,h*.16);ctx.fillRect(-w*.30,h*.42,w*.17,h*.16);ctx.fillRect(w*.14,h*.42,w*.17,h*.16);
    ctx.fillStyle=player?'#e6b94f':o.color;rounded(-w/2,-h/2,w,h,7);ctx.fill();
    ctx.fillStyle=player?'#f9d96f':'#ffffff25';rounded(-w*.29,-h*.42,w*.55,h*.84,5);ctx.fill();
    ctx.fillStyle='#233a4a';rounded(-w*.17,-h*.35,w*.26,h*.7,3);ctx.fill();
    ctx.fillStyle='#a8d4db';rounded(w*.17,-h*.33,w*.15,h*.66,3);ctx.fill();
    ctx.fillStyle='#fff0ba';ctx.fillRect(w/2-5,-h*.37,4,7);ctx.fillRect(w/2-5,h*.21,4,7);
    ctx.fillStyle='#ee796a';ctx.fillRect(-w/2+2,-h*.37,4,7);ctx.fillRect(-w/2+2,h*.21,4,7);
    if(player){ctx.strokeStyle='#ffe6a8';ctx.lineWidth=2;ctx.strokeRect(-w/2-2,-h/2-2,w+4,h+4);}
    ctx.restore();
  }
  function drawObstacles() {
    for(const o of obstacles){
      if(o.type==='car'){drawCar(o);continue;}
      if(o.type==='wall'){ctx.fillStyle='#1e303c';rounded(o.x-o.w/2-3,o.y-o.h/2+4,o.w+6,o.h+4,4);ctx.fill();ctx.fillStyle='#e6b765';rounded(o.x-o.w/2,o.y-o.h/2,o.w,o.h,4);ctx.fill();ctx.fillStyle='#564d3d';for(let x=o.x-o.w/2+7;x<o.x+o.w/2-3;x+=18)ctx.fillRect(x,o.y-o.h/2,7,o.h);continue;}
      ctx.fillStyle='#202b32';ctx.beginPath();ctx.ellipse(o.x,o.y+5,17,7,0,0,PI*2);ctx.fill();ctx.fillStyle='#ef8955';ctx.beginPath();ctx.moveTo(o.x,o.y-16);ctx.lineTo(o.x-12,o.y+10);ctx.lineTo(o.x+12,o.y+10);ctx.closePath();ctx.fill();ctx.fillStyle='#fff2d0';ctx.fillRect(o.x-6,o.y+2,12,3);
    }
  }
  function drawGuides() {
    if(car.v>=-1 && !held.has('reverse')) return;
    ctx.save();ctx.strokeStyle='#9af0aeaa';ctx.lineWidth=2;ctx.setLineDash([7,7]);
    for(const sign of [-1,1]){ctx.beginPath();let x=car.x,y=car.y,a=car.a;const steer=(held.has('right')?1:0)-(held.has('left')?1:0);for(let i=0;i<17;i++){x-=Math.cos(a)*8;y-=Math.sin(a)*8;a-=steer*.035;const px=x-Math.sin(a)*sign*CAR_W*.36,py=y+Math.cos(a)*sign*CAR_W*.36;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();}ctx.restore();
  }
  function draw() {
    ctx.clearRect(0,0,W,H);drawBackground();drawObstacles();drawGuides();drawCar({...car,w:CAR_L,h:CAR_W},true);
    if(parkedFor>0){ctx.save();ctx.strokeStyle='#a9ffa6';ctx.lineWidth=5;ctx.beginPath();ctx.arc(car.x,car.y,53,-PI/2,-PI/2+2*PI*clamp(parkedFor,0,1));ctx.stroke();ctx.restore();}
  }
  function frame(now){const dt=Math.min((now-lastFrame)/1000||0,.033);lastFrame=now;update(dt);draw();requestAnimationFrame(frame);}
  document.addEventListener('keydown',e=>{if(keyMap[e.code]){e.preventDefault();held.add(keyMap[e.code]);}else if(e.code==='KeyR'){restart();}else if(e.code==='KeyP'||e.code==='Escape'){if(mode==='playing'||mode==='paused')pause();}});
  document.addEventListener('keyup',e=>{if(keyMap[e.code])held.delete(keyMap[e.code]);});
  window.addEventListener('blur',()=>{held.clear();if(mode==='playing')pause();});
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    const release=e=>{held.delete(control);button.classList.remove('is-down');try{button.releasePointerCapture(e.pointerId);}catch{}};
    button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();held.add(control);button.classList.add('is-down');button.setPointerCapture(e.pointerId);});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',()=>{held.delete(control);button.classList.remove('is-down');});
  });
  ui.restart.addEventListener('click',restart);
  ui.pause.addEventListener('click',pause);
  ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.sound.setAttribute('aria-pressed',String(soundOn));ui.sound.setAttribute('aria-label',soundOn?'关闭声音':'开启声音');ui.sound.textContent=soundOn?'♪':'♩';});
  ui['overlay-action'].addEventListener('click',()=>{if(mode==='intro'){mode='playing';hideOverlay();}else if(mode==='paused')pause();else if(mode==='won'){if(levelIndex===levels.length-1)configure(0);else configure(levelIndex+1);mode='playing';hideOverlay();}});
  configure(0);requestAnimationFrame(frame);
})();
