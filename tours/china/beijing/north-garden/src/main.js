import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildWorld} from './scene.js';
import {createTerrain,toGeo,polygons,lines,inPolygon,bounds,ringDistance} from './geo.js';
const $=s=>document.querySelector(s),canvas=$('#scene');
const progress=(n,text)=>{$('#progress').value=n;$('#load-text').textContent=text;};
const toast=(s)=>{$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),5000);};
let data,renderer;
try{
 progress(8,'读取已保存的北园开放地理数据');
 const response=await fetch('./data/scene.json');if(!response.ok)throw Error(`地理数据 HTTP ${response.status}`);data=await response.json();
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
}catch(e){$('#failure').hidden=false;$('#failure p').textContent=`加载失败：${e.message}。请使用 README 中的本地服务启动方式。`;throw e;}
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.15,14000),terrain=createTerrain(data);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=6;controls.maxDistance=4200;controls.maxPolarAngle=Math.PI/2-.04;controls.screenSpacePanning=false;controls.zoomSpeed=.75;controls.panSpeed=.7;
const world=await buildWorld(scene,renderer,data,terrain,progress);
let quality='medium',mode='orbit',selected=data.pois[0],flight=null,markersVisible=true,last=performance.now(),time=0,frames=0,elapsed=0,fps=0;
let yaw=0,pitch=0,lookDrag=null;const keys=new Set(),direction=new THREE.Vector3(),focus=new THREE.Vector3();
const [xmin,zmin,xmax,zmax]=bounds(data.boundary[0]);
const initial={position:new THREE.Vector3(1380,1830,1850),target:new THREE.Vector3(-65,65,-110)};
camera.position.copy(initial.position);controls.target.copy(initial.target);controls.update();
function setQuality(v){quality=v;renderer.setPixelRatio(Math.min(devicePixelRatio,v==='high'?1.5:v==='medium'?1:.8));renderer.shadowMap.enabled=v!=='low';world.sun.shadow.mapSize.set(v==='high'?4096:2048,v==='high'?4096:2048);if(world.sun.shadow.map){world.sun.shadow.map.dispose();world.sun.shadow.map=null;}resize();}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
setQuality('medium');addEventListener('resize',resize);
$('#quality').addEventListener('change',e=>{setQuality(e.target.value);toast(`已切换${{high:'高',medium:'中',low:'低'}[quality]}画质`);});
function fly(pos,target,duration=1.8){
 exitWalk();flight={from:camera.position.clone(),fromTarget:controls.target.clone(),pos,target,t:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:duration};controls.enabled=false;
}
function goTo(p,near=false){const [x,z]=p.position,y=terrain.surface(x,z);fly(new THREE.Vector3(x+(near?100:300),y+(near?66:370),z+(near?140:420)),new THREE.Vector3(x,y+(near?9:0),z));}
function select(p,move=true){selected=p;$('#poi-title').textContent=p.name;$('#poi-subtitle').textContent=p.subtitle;$('#poi-description').textContent=p.description;$('#poi-status').textContent=p.status;$('#poi-source').href=p.url;document.querySelectorAll('[data-poi]').forEach(b=>b.classList.toggle('active',b.dataset.poi===p.id));markerNodes.forEach(o=>o.el.classList.toggle('selected',o.p===p));if(move)goTo(p);}
const markerNodes=[];
for(const p of data.pois){
 const b=document.createElement('button');b.textContent=p.name;b.dataset.poi=p.id;b.addEventListener('click',()=>select(p));$('#place-list').append(b);
 const el=document.createElement('button');el.className='marker';el.textContent=p.name;el.setAttribute('aria-label',`定位${p.name}`);el.addEventListener('click',()=>select(p));$('#markers').append(el);markerNodes.push({p,el});
}
select(selected,false);
$('#visit').onclick=()=>goTo(selected,true);
$('#home').onclick=()=>{fly(initial.position.clone(),initial.target.clone());toast('已返回北园总览');};
$('#top-view').onclick=()=>fly(new THREE.Vector3((xmin+xmax)/2,3100,(zmin+zmax)/2+.01),new THREE.Vector3((xmin+xmax)/2,0,(zmin+zmax)/2));
$('#toggle-markers').onclick=()=>{markersVisible=!markersVisible;$('#toggle-markers').setAttribute('aria-pressed',markersVisible);};
$('#collapse-places').onclick=()=>{const c=$('.places').classList.toggle('collapsed');$('#collapse-places').textContent=c?'展开景点介绍':'收起景点介绍';$('#collapse-places').setAttribute('aria-expanded',!c);};
$('#data-button').onclick=()=>{keys.clear();if(document.pointerLockElement)document.exitPointerLock();$('#data-dialog').showModal();};$('#close-data').onclick=()=>$('#data-dialog').close();
$('#data-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget&& (e.offsetX<0||e.offsetY<0||e.offsetX>e.target.offsetWidth||e.offsetY>e.target.offsetHeight))e.target.close();});
function modeUI(){for(const id of ['orbit','walk']){$('#'+id).classList.toggle('active',mode===id);$('#'+id).setAttribute('aria-pressed',mode===id);}$('#controls-help').textContent=mode==='orbit'?'拖拽旋转 · 滚轮缩放 · 右键平移':'WASD 步行 · Shift 快走 · 拖拽看向 · 单击锁定 / Esc 释放';$('#touch-controls').hidden=mode!=='walk'||!matchMedia('(pointer:coarse)').matches;}
function exitWalk(){mode='orbit';keys.clear();if(document.pointerLockElement)document.exitPointerLock();controls.enabled=true;modeUI();}
function nearestWalk(x,z){
 let best=null,dist=Infinity;
 for(const f of data.features.filter(f=>f.kind==='road'))for(const path of lines(f.geometry))for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1))),xx=a[0]+u*dx,zz=a[1]+u*dz,d=Math.hypot(xx-x,zz-z);
  if(d<dist&&terrain.canWalk(xx,zz)&&terrain.buildings.every(({poly})=>ringDistance(xx,zz,poly[0])>8)){best=[xx,zz];dist=d;}}
 if(best)return best;
 for(let r=2;r<100;r+=2)for(let a=0;a<Math.PI*2;a+=.25){const xx=x+r*Math.cos(a),zz=z+r*Math.sin(a);if(terrain.canWalk(xx,zz))return [xx,zz];}
 throw Error('该区域没有可通行位置');
}
function enterWalk(x,z,lookAt){
 try{const [xx,zz]=nearestWalk(x,z);mode='walk';flight=null;controls.enabled=false;keys.clear();camera.position.set(xx,terrain.surface(xx,zz)+1.65,zz);
  const at=lookAt??new THREE.Vector3(selected.position[0],terrain.height(...selected.position)+9,selected.position[1]);direction.copy(at).sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.max(-.65,Math.min(.65,Math.asin(direction.y)));applyLook();modeUI();canvas.focus();toast('视高 1.65 m · 步行 1.4 m/s · 支持地形与建筑、水体碰撞');
 }catch(e){toast(e.message);}
}
function applyLook(){camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;camera.rotation.z=0;}
$('#ground-here').onclick=()=>enterWalk(...selected.position);
$('#walk').onclick=()=>{if(mode!=='walk')enterWalk(...selected.position);};
$('#orbit').onclick=()=>{if(mode==='walk'){const p=camera.position.clone();fly(p.clone().add(new THREE.Vector3(65,70,90)),new THREE.Vector3(p.x,terrain.height(p.x,p.z),p.z));}};
addEventListener('keydown',e=>{if(mode!=='walk'||$('#data-dialog').open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();});
canvas.addEventListener('pointerdown',e=>{if(mode==='walk'){lookDrag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(mode!=='walk')return;if(document.pointerLockElement===canvas){yaw-=e.movementX*.002;pitch-=e.movementY*.002;}else if(lookDrag){const dx=e.clientX-lookDrag.x,dy=e.clientY-lookDrag.y;yaw-=dx*.003;pitch-=dy*.003;lookDrag.x=e.clientX;lookDrag.y=e.clientY;lookDrag.moved ||=Math.abs(dx)+Math.abs(dy)>1;}else return;pitch=Math.max(-1.35,Math.min(1.35,pitch));applyLook();});
canvas.addEventListener('pointerup',async e=>{const click=lookDrag&&!lookDrag.moved;lookDrag=null;if(mode==='walk'&&click&&e.pointerType==='mouse'&&!document.pointerLockElement){try{await canvas.requestPointerLock();}catch{toast('此浏览器未提供鼠标锁定，仍可拖拽看向。');}}});
canvas.addEventListener('pointercancel',()=>{lookDrag=null;});
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(b.dataset.move);b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys.delete(b.dataset.move));}
function moveWalk(dt){
 const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);if(!f&&!s)return;
 const len=Math.hypot(f,s),speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.8:1.4),dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)/len*speed*dt,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)/len*speed*dt;
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<n;i++){
  let x=camera.position.x,z=camera.position.z,y=terrain.surface(x,z);
  const ok=(a,b)=>terrain.canWalk(a,b)&&Math.abs(terrain.surface(a,b)-y)<Math.max(.09,Math.hypot(a-x,b-z)*.8);
  if(ok(x+dx/n,z+dz/n)){x+=dx/n;z+=dz/n;}else if(ok(x+dx/n,z))x+=dx/n;else if(ok(x,z+dz/n))z+=dz/n;
  camera.position.set(x,terrain.surface(x,z)+1.65,z);
 }
}
const map=$('#map'),ctx=map.getContext('2d'),baseMap=document.createElement('canvas');baseMap.width=baseMap.height=460;const mc=baseMap.getContext('2d');
const mapScale=410/Math.max(xmax-xmin,zmax-zmin),mapX=230-(xmin+xmax)/2*mapScale,mapZ=230-(zmin+zmax)/2*mapScale;
function xy(x,z){return [mapX+x*mapScale,mapZ+z*mapScale];}
function mapPath(context,points){points.forEach(([x,z],i)=>{const [a,b]=xy(x,z);i?context.lineTo(a,b):context.moveTo(a,b);});}
mc.fillStyle='#e9eee1';mc.fillRect(0,0,460,460);mc.beginPath();data.boundary.forEach(r=>mapPath(mc,r));mc.fillStyle='#c6d4b7';mc.fill();mc.strokeStyle='#788d6c';mc.lineWidth=1.4;mc.stroke();
for(const f of data.features){if(['water','building'].includes(f.kind)||(f.kind==='road'&&polygons(f.geometry).length)){mc.fillStyle=f.kind==='water'?'#84a4a0':f.kind==='road'?'#f7f7e8':'#949183';for(const poly of polygons(f.geometry)){mc.beginPath();poly.forEach(r=>{mapPath(mc,r);mc.closePath();});mc.fill('evenodd');}}
 if(f.kind==='road'){mc.strokeStyle='#f7f7e8';mc.lineWidth=Math.max(.7,f.width*mapScale);for(const line of lines(f.geometry)){mc.beginPath();mapPath(mc,line);mc.stroke();}}}
for(const p of data.pois){const [x,z]=xy(...p.position);mc.fillStyle='#244b3a';mc.beginPath();mc.arc(x,z,4.5,0,Math.PI*2);mc.fill();}
$('.map-scale span').style.width=`${200*mapScale*200/460}px`;
map.addEventListener('click',e=>{const r=map.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*460,pz=(e.clientY-r.top)/r.height*460,x=(px-mapX)/mapScale,z=(pz-mapZ)/mapScale;if(!inPolygon(x,z,data.boundary)){toast('所选位置在已映射的北园边界外');return;}if(mode==='walk')enterWalk(x,z);else fly(new THREE.Vector3(x+180,terrain.height(x,z)+250,z+280),new THREE.Vector3(x,terrain.height(x,z),z));});
function drawMap(){ctx.drawImage(baseMap,0,0);const at=mode==='walk'?camera.position:controls.target;const [x,z]=xy(at.x,at.z);camera.getWorldDirection(direction);const angle=Math.atan2(direction.x,-direction.z);ctx.save();ctx.translate(x,z);ctx.rotate(angle);ctx.fillStyle='#edc36844';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,48,-Math.PI/2-.45,-Math.PI/2+.45);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();ctx.fillStyle='#b46e36';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();const [lon,lat]=toGeo(at.x,at.z);$('#location').textContent=`${lat.toFixed(5)} N / ${lon.toFixed(5)} E`;$('#heading').textContent=`${((angle*180/Math.PI+360)%360).toFixed(0).padStart(3,'0')}°`;}
function capture(){renderer.render(scene,camera);const a=document.createElement('a');a.download=`north-garden-${mode}-${Date.now()}.png`;a.href=canvas.toDataURL('image/png');a.click();toast('已保存场景截图（不含界面）');}
$('#capture').onclick=capture;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形上下文丢失，请刷新恢复；可尝试低画质。');});
let sampleTime=0,mapTime=0;
function render(now){
 requestAnimationFrame(render);const rawDt=(now-last)/1000,dt=Math.min(rawDt,.1);last=now;if(document.hidden||$('#data-dialog').open)return;time+=dt;
 if(flight){flight.t+=dt;const u=flight.duration===0?1:Math.min(1,flight.t/flight.duration),s=u*u*(3-2*u);camera.position.lerpVectors(flight.from,flight.pos,s);controls.target.lerpVectors(flight.fromTarget,flight.target,s);camera.lookAt(controls.target);if(u===1){flight=null;controls.enabled=true;controls.update();}}
 else if(mode==='walk')moveWalk(dt);
 else{controls.update();controls.target.x=THREE.MathUtils.clamp(controls.target.x,xmin-60,xmax+60);controls.target.z=THREE.MathUtils.clamp(controls.target.z,zmin-60,zmax+60);camera.position.y=Math.max(camera.position.y,terrain.height(camera.position.x,camera.position.z)+1.7);}
 focus.copy(mode==='walk'?camera.position:controls.target);world.update(camera,focus,quality,time);
 for(const {p,el} of markerNodes){const v=new THREE.Vector3(p.position[0],terrain.height(...p.position)+22,p.position[1]);v.project(camera);const visible=markersVisible&&v.z<1&&v.z>-1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1;el.hidden=!visible;if(visible){el.style.left=`${(v.x*.5+.5)*innerWidth}px`;el.style.top=`${(-v.y*.5+.5)*innerHeight}px`;}}
 renderer.render(scene,camera);frames++;elapsed+=rawDt;mapTime+=dt;
 if(mapTime>.12){drawMap();mapTime=0;}
 if(elapsed>1){fps=frames/elapsed;$('#telemetry').textContent=`${fps.toFixed(0)} FPS · ${(renderer.info.render.triangles/1000).toFixed(0)}k △`;frames=0;elapsed=0;}
 $('#scene').dataset.position=JSON.stringify(camera.position.toArray());$('#scene').dataset.walkingHeight=(camera.position.y-terrain.surface(camera.position.x,camera.position.z)).toFixed(3);
}
progress(100,'场景已就绪');renderer.render(scene,camera);window.gardenReady=true;$('#loader').style.opacity='0';setTimeout(()=>$('#loader').remove(),650);requestAnimationFrame(render);
// Explicit read-only diagnostics and deterministic view hooks for reproducible acceptance captures.
window.garden={data,camera,scene,renderer,terrain,controls,goTo,enterWalk,nearestWalk,setQuality,
 getState:()=>({mode,quality,selected:selected.id,position:camera.position.toArray(),target:controls.target.toArray(),fps,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,origin:data.meta.origin,counts:data.counts}),
 home:()=>fly(initial.position.clone(),initial.target.clone(),0),top:()=>fly(new THREE.Vector3((xmin+xmax)/2,3100,(zmin+zmax)/2+.01),new THREE.Vector3((xmin+xmax)/2,0,(zmin+zmax)/2),0),
 setView:(position,target)=>fly(new THREE.Vector3(...position),new THREE.Vector3(...target),0),
 sample:async(seconds=5)=>{const samples=[];let previous=performance.now(),start=previous;await new Promise(resolve=>{function tick(t){samples.push(t-previous);previous=t;if(t-start<seconds*1000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});samples.shift();const avg=samples.reduce((a,b)=>a+b,0)/samples.length;return {fps:1000/avg,frameTimeMeanMs:avg,frames:samples.length,seconds,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],pixelRatio:renderer.getPixelRatio(),quality,mode,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};}
};
$('#benchmark').onclick=async()=>{
 $('#data-dialog').close();toast('预热 2 秒后采样 5 秒，请保持页面可见');
 await new Promise(resolve=>setTimeout(resolve,2000));
 const result=await window.garden.sample(5),gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 result.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'Unavailable';result.logicalProcessors=navigator.hardwareConcurrency;result.date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());result.timestamp=new Date().toISOString();result.warmupSeconds=2;
 $('#benchmark-report').textContent=JSON.stringify(result,null,2);$('#data-dialog').showModal();
};
if(new URL(location.href).searchParams.get('view')==='lake'){
 const x=275,z=452;enterWalk(x,z,new THREE.Vector3(185,terrain.surface(x,z)+3,265));toast('湖岸视觉参考机位；与历史照片的相机位置尚未配准');
}


