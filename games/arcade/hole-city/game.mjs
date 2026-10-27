import * as THREE from '../../../assets/vendor/three.module.r160.js';
import { CityGame, WORLD, ROUND_SECONDS, LEVELS, TITLES, levelForScore } from './core.mjs';

const $=id=>document.getElementById(id), canvas=$('city');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let game, selectedMode='race', renderer, scene, camera, ground, actors=[], models=[], falling=[], labels=[], particles=[];
let occluders=[];
let last=0, uiClock=0, audio, soundOn=true, pointer=null, focusBeforePause, toastUntil=0, stopped=false;
const keys=new Set(), cameraFocus=new THREE.Vector3(0,0,-12), raycaster=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const pointerWorld=new THREE.Vector3(), viewSize=new THREE.Vector2(), scratch=new THREE.Vector3();
const matCache=new Map(), geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,8),sphere:new THREE.IcosahedronGeometry(1,0)};
const cityMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
function packGroup(group,castShadow=true){
  // One draw call per swallowable prop, and one for all roads and sidewalks.
  const positions=[],normals=[],colors=[],v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  for(const child of [...group.children]){
    child.updateMatrix();normalMatrix.getNormalMatrix(child.matrix);
    const source=child.geometry,geo=source.index?source.toNonIndexed():source,p=geo.getAttribute('position'),normal=geo.getAttribute('normal'),color=child.material.color;
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(child.matrix);n.fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();
      positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
    }
    if(geo!==source)geo.dispose();group.remove(child);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeBoundingSphere();
  const mesh=new THREE.Mesh(geo,cityMaterial);mesh.castShadow=castShadow;mesh.receiveShadow=true;group.add(mesh);return group;
}
let bests={race:0,free:0};
try { bests={...bests,...JSON.parse(localStorage.getItem('phdsx.hole-city.v1')||'{}')}; } catch {}
function material(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return matCache.get(color);}
function shape(parent,geo,color,x,y,z,sx,sy,sz,shadow=true){const mesh=new THREE.Mesh(geometries[geo],material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function box(parent,color,x,y,z,sx,sy,sz,shadow=true){return shape(parent,'box',color,x,y,z,sx,sy,sz,shadow);}
function textSprite(text,color='#ffffff',fontSize=36){
  const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d');
  ctx.font=`800 ${fontSize}px system-ui, Microsoft YaHei`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle='#173642';ctx.lineWidth=9;ctx.lineJoin='round';ctx.strokeText(text,192,48);ctx.fillStyle=color;ctx.fillText(text,192,48);
  const texture=new THREE.CanvasTexture(c),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(10,2.5,1);sprite.renderOrder=8;return sprite;
}
function init(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.5:2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#a6cdcf');renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color('#a6cdcf');scene.fog=new THREE.Fog('#a6cdcf',165,330);
  camera=new THREE.OrthographicCamera(-45,45,35,-35,.1,500);
  scene.add(new THREE.HemisphereLight('#fff8df','#7593a0',2.4));
  const sun=new THREE.DirectionalLight('#fff4db',3.2);sun.position.set(-65,110,-40);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-140;sun.shadow.camera.right=140;sun.shadow.camera.top=140;sun.shadow.camera.bottom=-140;sun.shadow.camera.far=300;sun.shadow.normalBias=.055;sun.shadow.bias=-.0001;scene.add(sun);
  ground=new THREE.Group();scene.add(ground);
  box(ground,'#82b9bb',0,-1.1,0,800,1,800,false);
  box(ground,'#e2d6b6',0,-.62,0,WORLD+5,1,WORLD+5,false);
  box(ground,'#687d83',0,-.05,0,WORLD,.12,WORLD,false);
  for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){
    const x=-90+ix*36,z=-90+iz*36,park=(ix+iz)%4===0;
    box(ground,'#d9d7c7',x,.03,z,29,.2,29,false);
    box(ground,park?'#9cba72':'#cbc9b4',x,.15,z,25.6,.12,25.6,false);
    if(park){box(ground,'#e0d4b4',x,.23,z,2,.05,25.6,false);box(ground,'#e0d4b4',x,.23,z,25.6,.05,2,false);}
  }
  // Road paint and crosswalks are permanent, so an empty city still has structure.
  for(let i=0;i<7;i++){
    const line=-108+i*36;
    for(let p=-100;p<106;p+=9){box(ground,'#d9dbc1',line,.025,p,.18,.03,3,false);box(ground,'#d9dbc1',p,.025,line,3,.03,.18,false);}
    for(let j=0;j<6;j++)for(let k=0;k<4;k++){
      const at=-90+j*36;
      box(ground,'#ece5cf',line-2.1+k*1.4,.03,at-15,.7,.04,2.4,false);
      box(ground,'#ece5cf',at-15,.03,line-2.1+k*1.4,2.4,.04,.7,false);
    }
  }
  // An understated seawall frames the playable island.
  for(const side of [-1,1]){box(ground,'#efdfbd',side*109,.12,0,1,.6,220,false);box(ground,'#efdfbd',0,.12,side*109,220,.6,1,false);}
  packGroup(ground,false);
  resize();buildGame(new CityGame({seed:1368}));game.status='ready';
  $('start').disabled=false;$('start').textContent='开始吞噬 →';requestAnimationFrame(frame);
}
function buildObject(o){
  const g=new THREE.Group(),v=o.variant;
  const roofs=['#d27a66','#e6b566','#6794a0','#9a96ae','#bc8e80'],cars=['#e78d63','#efcf72','#77a3ad','#c4d7d1','#b59bc0'];
  let height=2;
  if(o.kind==='person'){
    const shirt=['#f5cc70','#de8c7a','#6ca1b3','#b095ba'][Math.floor(v*4)];
    box(g,'#46545c',0,.35,0,.5,.7,.36);box(g,shirt,0,.96,0,.68,.75,.5);shape(g,'sphere','#e4b997',0,1.62,0,.34,.36,.34);height=2;
  }else if(o.kind==='cone'){
    box(g,'#7b6e5e',0,.12,0,.8,.18,.8);shape(g,'cone','#f29653',0,.6,0,.37,.95,.37);shape(g,'cylinder','#fff1ce',0,.63,0,.21,.14,.21);height=1.2;
  }else if(o.kind==='bin'){
    box(g,'#548e85',0,.58,0,.9,1.15,.85);box(g,'#385f60',0,1.2,0,1.05,.15,.98);height=1.4;
  }else if(o.kind==='tree'){
    shape(g,'cylinder','#8f7659',0,1.3,0,.23,2.6,.23);
    shape(g,'sphere',v>.5?'#6d995b':'#8aaa67',0,3,0,1.5,1.85,1.4);shape(g,'sphere','#9abc7b',.4,3.65,.1,1.05,1.1,1.1);height=4.8;
  }else if(o.kind==='lamp'){
    shape(g,'cylinder','#52676d',0,2,0,.12,4,.12);box(g,'#52676d',.5,3.95,0,1.2,.16,.18);box(g,'#fff1b9',1,3.84,0,.65,.18,.5);height=4.2;
  }else if(o.kind==='bench'){
    box(g,'#9f7350',0,.8,0,2.5,.2,.85);box(g,'#b99163',0,1.3,-.4,2.5,.9,.15);
    for(const x of [-.9,.9])box(g,'#536968',x,.4,0,.15,.8,.75);height=1.9;
  }else if(o.kind==='car'){
    box(g,cars[Math.floor(v*5)],0,.83,0,1.9,1,3.8);box(g,cars[Math.floor(v*5)],0,1.55,-.15,1.65,.65,1.95);
    box(g,'#aacbd0',0,1.6,.86,1.45,.48,.08);box(g,'#799eac',0,1.6,-1.15,1.45,.42,.08);
    for(const x of [-.99,.99])for(const z of [-1.2,1.2]){const wheel=shape(g,'cylinder','#34464b',x,.48,z,.4,.19,.4);wheel.rotation.z=Math.PI/2;}
    box(g,'#fff4c6',0,.82,1.93,1.5,.24,.05);box(g,'#c96d58',0,.82,-1.93,1.5,.2,.05);g.rotation.y=v>.5?Math.PI/2:0;height=2.2;
  }else{
    const house=o.kind==='house',tower=o.kind==='tower',w=house?5.8:tower?11.8:9,d=house?5.6:tower?11:9,h=house?5+v*2:tower?21+v*8:11+v*6;
    const color=['#efcfaa','#e9bfa4','#bfd1c5','#d8d0b2','#c1c7d2'][Math.floor(v*5)];
    box(g,'#abac9b',0,.35,0,w+.55,.7,d+.55);box(g,color,0,h/2+.35,0,w,h,d);height=h+1.2;
    box(g,roofs[Math.floor(v*5)],0,h+.58,0,w+.5,.5,d+.5);
    if(house){const roof=shape(g,'cylinder',roofs[Math.floor(v*5)],0,h+1.1,0,1,1,1);roof.geometry=roofGeometry;roof.scale.set(w/2+.5,1.5,d/2+.5);height=h+2.8;box(g,'#8b7368',0,1.3,d/2+.02,1.15,2,.1);}
    else{box(g,'#a7b3ac',w*.2,h+1.2,-d*.18,2,1,2);box(g,'#708c94',0,1.7,d/2+.03,2.4,2.7,.12);}
    // Windows arranged in compact rows on the two camera-facing facades.
    const rows=house?1:tower?7:4,cols=house?2:3;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const y=house?3.7:3+row*(h-4)/rows,offset=(col-(cols-1)/2)*(w/(cols+1));
      box(g,row%3===0?'#718f99':'#86a9ac',offset,y,d/2+.035,house?1.1:1.35,house?1.35:1.45,.07,false);
      box(g,'#7e9da2',w/2+.035,y,offset,.07,house?1.35:1.45,house?1.1:1.35,false);
    }
  }
  packGroup(g);g.position.set(o.x,.12,o.z);g.userData={height,object:o};return g;
}
const roofGeometry=new THREE.CylinderGeometry(0,1,1,4,1,false,Math.PI/4);
function makeActor(h){
  const g=new THREE.Group();
  const disk=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#081721',polygonOffset:true,polygonOffsetFactor:-4}));disk.rotation.x=-Math.PI/2;disk.position.y=.32;g.add(disk);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.055,8,64),new THREE.MeshBasicMaterial({color:h.color}));ring.rotation.x=Math.PI/2;ring.position.y=.36;g.add(ring);
  const inside=new THREE.Mesh(new THREE.TorusGeometry(.78,.018,4,48),new THREE.MeshBasicMaterial({color:'#243941'}));inside.rotation.x=Math.PI/2;inside.position.y=.34;g.add(inside);
  scene.add(g);
  const label=textSprite(h.name,h.color);scene.add(label);labels.push(label);
  return g;
}
function clearGame(){
  for(const m of models){scene.remove(m);m.children[0].geometry.dispose();if(m.children[0].material!==cityMaterial)m.children[0].material.dispose();}
  for(const a of actors){scene.remove(a);a.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  for(const label of labels){scene.remove(label);label.material.map.dispose();label.material.dispose();}
  for(const p of particles){scene.remove(p.mesh);p.mesh.material.map.dispose();p.mesh.material.dispose();}
  models=[];actors=[];labels=[];falling=[];particles=[];occluders=[];
}
function buildGame(next){
  clearGame();game=next;
  for(const o of game.objects){
    const mesh=buildObject(o);scene.add(mesh);models.push(mesh);
    if(mesh.userData.height>5){
      mesh.children[0].material=cityMaterial.clone();mesh.children[0].material.transparent=true;
      occluders.push({mesh,box:new THREE.Box3().setFromObject(mesh)});
    }
  }
  for(const h of game.holes)actors.push(makeActor(h));cameraFocus.set(game.player.x,0,game.player.z);updateUI();
}
function begin(){
  buildGame(new CityGame({seed:Math.floor(Math.random()*2**31),mode:selectedMode}));game.start();unlockAudio();hideOverlays();setHUD(true);$('pause').disabled=false;keys.clear();resetPointer();canvas.focus();showToast('先吃小物件，让黑洞长大');
}
function hideOverlays(){for(const id of ['menu','pause-menu','result'])$(id).hidden=true;}
function setHUD(show){document.querySelector('.hud').hidden=!show;document.querySelector('.growth').hidden=!show;$('leaderboard').hidden=!show||game.mode==='free';}
function menu(){hideOverlays();$('menu').hidden=false;game.status='ready';$('pause').disabled=true;setHUD(false);keys.clear();resetPointer();$('start').focus();}
function pause(){if(game.status!=='playing')return;focusBeforePause=document.activeElement;game.pause();$('pause-menu').hidden=false;keys.clear();resetPointer();$('resume').focus();}
function resume(){if(game.status!=='paused')return;game.resume();$('pause-menu').hidden=true;(focusBeforePause||canvas).focus();}
function unlockAudio(){if(!soundOn)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function tone(frequency=200,duration=.09,volume=.025){
  if(!soundOn||!audio||audio.state!=='running')return;
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*.55,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
function showToast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+2600;}
function floatText(text,x,z,color){if(reducedMotion||particles.length>10)return;const mesh=textSprite(text,color,40);mesh.scale.set(7,1.75,1);mesh.position.set(x,5,z);scene.add(mesh);particles.push({mesh,age:0});}
function processEvents(){
  let ate=false;
  for(const event of game.drainEvents()){
    if(event.type==='eat'){
      const mesh=models[event.object],h=game.holes[event.hole];falling.push({mesh,hole:h,x:mesh.position.x,z:mesh.position.z,age:0});
      if(event.hole===0){ate=true;if(event.points>=7)floatText(`+${event.points}`,mesh.position.x,mesh.position.z,'#e5ffb3');}
    }else if(event.type==='level'&&event.hole===0){showToast(`升到 ${event.level+1} 级！${TITLES[event.level]}`);tone(580,.2,.06);}
    else if(event.type==='capture'){
      if(event.victim===0){showToast('被大黑洞吞掉了！3 秒后重返城市');tone(120,.3,.06);}
      if(event.hole===0){showToast(`吞掉 ${game.holes[event.victim].name}，+${event.points} 分`);tone(430,.25,.06);}
    }else if(event.type==='respawn'&&event.hole===0){cameraFocus.set(game.player.x,0,game.player.z);showToast('重返城市！短暂无敌，继续变大');}
    else if(event.type==='finish')finish();
  }
  if(ate){tone(180+game.player.radius*26,.09,.025);updateUI();}
}
function finish(){
  keys.clear();resetPointer();$('pause').disabled=true;
  const p=game.player,rank=game.rankings().findIndex(h=>h.id===0)+1,newBest=p.score>(Number(bests[game.mode])||0);
  if(newBest){bests[game.mode]=p.score;try{localStorage.setItem('phdsx.hole-city.v1',JSON.stringify(bests));}catch{}}
  $('result-kicker').textContent=newBest?'刷新个人最佳纪录':'本局完成';
  $('result-title').textContent=game.mode==='free'?'整座城市，都被你吞下了':rank===1?'第一名！城市属于你':`本局第 ${rank} 名`;
  $('result-description').textContent=game.mode==='free'?`自由吞噬完成，用时 ${Math.floor(game.elapsed/60)} 分 ${Math.floor(game.elapsed%60)} 秒。`:rank===1?'从街角的小黑洞，成长为城市里的大胃王。':'沿着街边小物件开始，连吃树木与汽车，下一局争夺第一！';
  $('final-score').textContent=p.score;$('final-count').textContent=p.count;$('final-level').textContent=levelForScore(p.score)+1;
  $('final-ranks').replaceChildren();if(game.mode==='race')for(const [i,h] of game.rankings().entries()){
    const li=document.createElement('li');li.className=h.id===0?'me':'';const a=document.createElement('span'),b=document.createElement('b');a.textContent=`${i+1}. ${h.name}`;b.textContent=`${h.score} 分`;li.append(a,b);$('final-ranks').append(li);
  }
  $('result').hidden=false;$('again').focus();tone(600,.4,.05);updateUI();
}
function updateUI(){
  const p=game.player,level=levelForScore(p.score),rank=game.rankings().findIndex(h=>h.id===0)+1,next=LEVELS[level+1],prev=LEVELS[level];
  $('score').textContent=p.score;$('best').textContent=`最佳 ${Math.max(Number(bests[game.mode])||0,p.score)}`;
  $('mode-label').textContent=game.mode==='free'?'自由吞噬':'限时争霸';
  const seconds=Math.ceil(game.mode==='free'?game.elapsed:game.time);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  document.querySelector('.timer-card').classList.toggle('urgent',game.mode==='race'&&game.time<20);
  $('rank').textContent=game.mode==='free'?`剩余 ${game.remaining} 件`:`第 ${rank} / ${game.holes.length} 名`;
  $('level').textContent=`${level+1} 级 · ${TITLES[level]}`;$('next').textContent=next?`再得 ${next-p.score} 分升级`:'已达最高等级';$('growth-fill').style.width=next?`${(p.score-prev)/(next-prev)*100}%`:'100%';
  $('hint').textContent=!p.alive?`${Math.ceil(p.respawn)} 秒后重新出发，保留 80% 得分`:p.radius<3?'先吃行人、路锥和树木，沿着街边快速成长':p.radius<4.72?'汽车也能吃了！瞄准路边停车位':p.radius<7.2?'可以吞下小房屋了，向住宅区进发':p.radius<9.7?'楼房也挡不住你！继续挑战更大的建筑':'整座城都是你的下一口！';
  $('ranks').replaceChildren();for(const [i,h] of game.rankings().entries()){
    const li=document.createElement('li');li.className=h.id===0?'me':'';
    const num=document.createElement('span'),dot=document.createElement('i'),name=document.createElement('span'),score=document.createElement('b');
    num.textContent=String(i+1);dot.className='dot';dot.style.background=h.color;name.textContent=h.name;score.textContent=h.score;li.append(num,dot,name,score);$('ranks').append(li);
  }
}
function inputVector(){
  let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  let y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(x||y){const length=Math.hypot(x,y);x/=length;y/=length;return{x:x*.8+y*.6,z:-x*.6+y*.8};}
  if(pointer){
    if(pointer.touch){x=(pointer.x-pointer.startX)/40;y=(pointer.y-pointer.startY)/40;const l=Math.hypot(x,y);if(l>.12){const power=Math.min(1,l);return{x:(x*.8+y*.6)/l*power,z:(-x*.6+y*.8)/l*power};}}
    else{raycaster.setFromCamera(new THREE.Vector2(pointer.x/viewSize.x*2-1,-pointer.y/viewSize.y*2+1),camera);if(raycaster.ray.intersectPlane(plane,pointerWorld)){const dx=pointerWorld.x-game.player.x,dz=pointerWorld.z-game.player.z,len=Math.hypot(dx,dz);if(len>.6)return{x:dx/len*Math.min(1,len/2),z:dz/len*Math.min(1,len/2)};}}
  }
  return{x:0,z:0};
}
function resetPointer(){pointer=null;$('joystick').hidden=true;}
function frame(now){
  if(stopped)return;
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(game.status==='playing'){game.update(dt,inputVector());processEvents();uiClock+=dt;if(uiClock>.12){updateUI();uiClock=0;}}
  const active=game.status==='playing'||game.status==='finished';
  if(game.status!=='paused'){
    for(let i=falling.length-1;i>=0;i--){const f=falling[i];f.age+=dt;const t=Math.min(1,f.age/.48),shrink=1-t*t;
      f.mesh.position.set(THREE.MathUtils.lerp(f.x,f.hole.x,t*.7),.12-t*t*(f.mesh.userData.height+2),THREE.MathUtils.lerp(f.z,f.hole.z,t*.7));f.mesh.scale.setScalar(shrink);f.mesh.rotation.x=t*.65;f.mesh.rotation.z=t*.4;
      if(t===1){f.mesh.visible=false;falling.splice(i,1);}
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.mesh.position.y+=dt*5;p.mesh.material.opacity=1-p.age/.85;if(p.age>=.85){scene.remove(p.mesh);p.mesh.material.map.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
  }
  for(const h of game.holes){const actor=actors[h.id],label=labels[h.id];actor.visible=h.alive;label.visible=h.alive;actor.position.set(h.x,0,h.z);actor.scale.setScalar(h.radius);label.position.set(h.x,1.8,h.z+h.radius+1.2);actor.children[1].material.color.set(h.shield>0&&Math.floor(now/150)%2?'#ffffff':h.color);}
  if(active&&game.player.alive){scratch.set(game.player.x,0,game.player.z);cameraFocus.lerp(scratch,1-Math.exp(-dt*6));}
  else if(game.status==='ready'){cameraFocus.lerp(new THREE.Vector3(0,0,-12),.02);}
  const span=active?Math.max(48,Math.min(96,42+game.player.radius*3.2)):78,aspect=viewSize.x/viewSize.y;
  const halfH=aspect<1?span*.95:span*.5,halfW=halfH*aspect;
  camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();camera.position.copy(cameraFocus).add(new THREE.Vector3(48,72,64));camera.lookAt(cameraFocus);
  camera.updateMatrixWorld();
  // Fade only buildings between the camera and the player, preserving navigation.
  if(active&&game.player.alive){
    scratch.set(game.player.x,.4,game.player.z).project(camera);raycaster.setFromCamera(new THREE.Vector2(scratch.x,scratch.y),camera);
    const targetDistance=raycaster.ray.origin.distanceTo(new THREE.Vector3(game.player.x,.4,game.player.z));
    for(const item of occluders){
      const hit=!item.mesh.userData.object.eaten&&raycaster.ray.intersectBox(item.box,new THREE.Vector3());
      const blocked=hit&&raycaster.ray.origin.distanceTo(hit)<targetDistance-1;
      const mat=item.mesh.children[0].material;mat.opacity=THREE.MathUtils.lerp(mat.opacity,blocked?.24:1,reducedMotion?1:Math.min(1,dt*12));mat.depthWrite=mat.opacity>.95;
    }
  }
  if(now>toastUntil)$('toast').classList.remove('show');renderer.render(scene,camera);
}
function resize(){viewSize.set(innerWidth,innerHeight);renderer.setSize(innerWidth,innerHeight,false);}
function showError(error){stopped=true;console.error(error);$('error').hidden=false;$('error-message').textContent='3D 画面未能启动。请使用支持 WebGL 的浏览器，开启硬件加速后重新加载。';}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{selectedMode=button.dataset.mode;for(const b of document.querySelectorAll('[data-mode]')){const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}});
$('start').addEventListener('click',begin);$('again').addEventListener('click',begin);$('restart').addEventListener('click',begin);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('back-menu').addEventListener('click',menu);$('result-menu').addEventListener('click',menu);$('reload').addEventListener('click',()=>location.reload());
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').textContent=`音效：${soundOn?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');if(soundOn)unlockAudio();});
window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(key==='tab'){const dialog=[...document.querySelectorAll('.overlay[role="dialog"]')].find(el=>!el.hidden);if(dialog){const controls=[...dialog.querySelectorAll('button:not(:disabled),a[href]')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}}return;}
  if(['escape','p'].includes(key)&&!event.repeat){event.preventDefault();game?.status==='playing'?pause():game?.status==='paused'?resume():null;return;}
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)&&game?.status==='playing'){event.preventDefault();keys.add(key);}
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
canvas.addEventListener('pointerdown',event=>{if(game.status!=='playing'||pointer)return;event.preventDefault();unlockAudio();canvas.focus();canvas.setPointerCapture(event.pointerId);pointer={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,touch:event.pointerType!=='mouse'};if(pointer.touch){$('joystick').hidden=false;$('joystick').style.left=`${event.clientX}px`;$('joystick').style.top=`${event.clientY}px`;$('joystick').firstElementChild.style.transform='translate(0,0)';}});
canvas.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;pointer.x=event.clientX;pointer.y=event.clientY;if(pointer.touch){const x=pointer.x-pointer.startX,y=pointer.y-pointer.startY,l=Math.hypot(x,y),scale=Math.min(1,34/(l||1));$('joystick').firstElementChild.style.transform=`translate(${x*scale}px,${y*scale}px)`;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{if(pointer?.id===event.pointerId)resetPointer();});
window.addEventListener('blur',()=>{if(game?.status==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.status==='playing')pause();});
window.addEventListener('resize',()=>{if(renderer)resize();});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();showError(new Error('WebGL context lost'));});
try{init();}catch(error){showError(error);}
