import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {centre,unproject} from './geo.js';
export function makePlaces(data,ground){
 const village=data.geo.areas.find(a=>a.id==='w611166527'),beach=data.geo.areas.find(a=>a.id==='w390385570'),bc=centre(village.points);
 const lp=beach.points.filter(p=>p[1]>2300&&p[1]<3700),lc=centre(lp.length?lp:beach.points);
 const coast=data.geo.coastlines[data.geo.mainIsland],cj=data.geo.areas.find(a=>a.id==='w990631702'),cc=centre(cj.points),tn=centre(data.geo.areas.find(a=>a.id==='w990631701').points),offshore=data.geo.turbines.filter(p=>!p.onLand&&p.x>1600&&p.x<6000&&p.z<-11000&&p.z>-17000),oc=centre(offshore.map(p=>[p.x,p.z]));
 const north=coast.reduce((a,p)=>Math.hypot(p[0],p[1]+15000)<Math.hypot(a[0],a[1]+15000)?p:a,coast[0]);
 return [
  {id:'beigang',name:'北港村',x:bc[0],z:bc[1],offset:[690,410,720],closeOffset:[115,72,135],description:'君山东麓的石厝聚落。两处映射建筑提供外观样板，其余分布保留历史影像。',accuracy:'真实位置 · 局部外观近似',source:'OSM residential w611166527; buildings w611957434, w611957440'},
  {id:'changjiang',name:'长江澳',x:cc[0],z:cc[1],offset:[3900,1650,2200],closeOffset:[800,155,-350],description:'真实映射的弧形浅色沙滩，连接陆上风车田与湾外海上风机。潮间带、干湿沙和宽阔海湾分别呈现。',accuracy:'真实沙滩与风机点位 · 潮位/尺寸近似',source:'OSM named beach w990631702, including intertidal polygon; representative polygon centre'},
  {id:'longwang',name:'龙王头',x:2600,z:2100,offset:[650,310,540],closeOffset:[210,75,200],description:'城市边缘的东向宽沙滩。红色电动观光小火车沿岸运行；三站与约800米线路为报道基础上的示意。',accuracy:'真实沙滩轮廓 · 小火车轨迹示意',source:'OSM beach w390385570; 2024 Pingtan news report for red electric train, approximately 800m/three stops; track coordinates not surveyed'},
  {id:'offshore',name:'海上风机',x:oc[0],z:oc[1],offset:[1000,400,1000],closeOffset:[450,170,480],description:'北部近海风机按81个真实海上点位生成，与99个陆上点位分开判定。海上基础和机组尺寸为类型化近似。',accuracy:'OSM真实海上点位 · 基础与机型近似',source:'Centroid of north-eastern OSM offshore generator cluster, not relocated land turbines'},
  {id:'tannan',name:'坛南湾',x:tn[0],z:tn[1],offset:[1000,370,700],closeOffset:[240,95,160],description:'东南岸浅色沙湾，两侧低丘与岬角围合。保留实际沙滩轮廓，展现宽沙岸与潮湿滩面。',accuracy:'真实沙滩轮廓 · 表层材质近似',source:'OSM named beach w990631701; nearby geography and MCT Tannanwan reference'},
  {id:'north-rock',name:'北部岩岸',x:north[0],z:north[1],offset:[500,230,-650],closeOffset:[120,70,-150],description:'北部岬角与礁石岸，和长江澳平缓沙滩形成区别。基岩群沿真实岸线布置，单块形状未测绘。',accuracy:'真实岬角岸线 · 岩石形态近似',source:'Actual OSM northern coast node near x0/z-15000; regional rocky-headland references, no exact geological survey'},
 ].concat(data.landmarks.places).concat((()=>{let max=-1,idx=0;for(let i=0;i<data.surface.length;i++)if(data.land[i]&&data.surface[i]>max){max=data.surface[i];idx=i;}return [{id:'junshan',name:'君山',region:'内陆',kind:'peak',x:data.meta.x0+(idx%data.meta.nx)*40,z:data.meta.z0+Math.floor(idx/data.meta.nx)*40,offset:[1500,780,1800],closeOffset:[260,150,300],accuracy:'真实DEM峰位 · 林地近似',source:'Maximum of downloaded Skadi land DEM grid; no elevation exaggeration',description:'全岛主要山体的真实高程与走向。定位为当前高程格网峰值，约430米，不冒充测量三角点；植被类型和单株位置为近似。'}];})()).map(p=>({...p,y:ground.height(p.x,p.z),lonLat:unproject(p.x,p.z)}));
}
export function createNavigation(camera,dom,ground,data,onChange){
 const orbit=new OrbitControls(camera,dom);orbit.enableDamping=true;orbit.dampingFactor=.065;orbit.minDistance=12;orbit.maxDistance=160000;orbit.minPolarAngle=.025;orbit.maxPolarAngle=Math.PI*.47;orbit.zoomSpeed=.65;orbit.panSpeed=.65;orbit.rotateSpeed=.55;
 const places=makePlaces(data,ground),keys=new Set(),velocity=new THREE.Vector3(),spherical=new THREE.Spherical(),look=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
 let mode='overview',selected=null,tween=null,yaw=0,pitch=0,drag=null;
 const startPosition=new THREE.Vector3(),startTarget=new THREE.Vector3(-200,40,-300);
 function fitOverview(){startPosition.set(...(camera.aspect<.85?[6500,76000,25000]:[10500,38000,34500]));}fitOverview();
 camera.position.copy(startPosition);orbit.target.copy(startTarget);orbit.update();
 function safe(p){const b=data.geo.metadata.bounds;if(mode==='fly'){p.x=THREE.MathUtils.clamp(p.x,b.x0-20000,b.x0+b.width+20000);p.z=THREE.MathUtils.clamp(p.z,b.z0-20000,b.z0+b.depth+20000);}p.y=Math.min(mode==='fly'?100000:160000,Math.max(ground.collisionHeight(p.x,p.z)+2.5,p.y));return p;}
 function syncLook(){camera.getWorldDirection(look);yaw=Math.atan2(-look.x,-look.z);pitch=Math.asin(look.y);}
 function setMode(m){mode=m;orbit.enabled=m!=='fly';velocity.set(0,0,0);keys.clear();if(m==='fly'){tween=null;syncLook();}onChange({mode,selected});}
 function transition(position,target,duration=2.4){safe(position);tween={from:camera.position.clone(),to:position.clone(),targetFrom:orbit.target.clone(),targetTo:target.clone(),time:0,duration};}
 function overview(){selected=null;setMode('overview');fitOverview();transition(startPosition,startTarget,2.6);}
 function place(id,close=false){const p=places.find(p=>p.id===id);if(!p)return;selected=p;setMode('spot');let t=new THREE.Vector3(p.x,p.aimY??p.y+10,p.z),o=close?p.closeOffset:p.offset,eye=t.clone().add(new THREE.Vector3(...o));if(close&&p.closeCamera){const rotate=v=>new THREE.Vector3(...v).applyAxisAngle(new THREE.Vector3(0,1,0),p.heading||0);eye=new THREE.Vector3(p.x,p.y,p.z).add(rotate(p.closeCamera));t=new THREE.Vector3(p.x,p.y,p.z).add(rotate(p.closeLook));}transition(eye,t);onChange({mode,selected});}
 function stone(){const h=data.geo.buildings.find(b=>b.id==='w611957434');selected=places[0];setMode('spot');const t=new THREE.Vector3(h.x,ground.height(h.x,h.z)+3.3,h.z);transition(t.clone().add(new THREE.Vector3(30,8,10)),t,2.1);onChange({mode,selected,stone:true});}
 function train(){selected=places.find(p=>p.id==='longwang');setMode('spot');const p=window.__pingtan.train.route.at(window.__pingtan.train.travelled),t=new THREE.Vector3(p.x,Math.max(.055,ground.collisionHeight(p.x,p.z))+2.6,p.z);transition(t.clone().add(new THREE.Vector3(13,6,14)),t,2.1);onChange({mode,selected,train:true});}
 orbit.addEventListener('start',()=>{tween=null;});
 dom.addEventListener('pointerdown',e=>{if(mode==='fly'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};dom.setPointerCapture(e.pointerId);}});
 dom.addEventListener('pointermove',e=>{if(mode==='fly'&&drag?.id===e.pointerId){yaw-=(e.clientX-drag.x)*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.0025,-1.35,1.35);drag.x=e.clientX;drag.y=e.clientY;}});
 const end=()=>{drag=null;};dom.addEventListener('pointerup',end);dom.addEventListener('pointercancel',end);
 dom.addEventListener('wheel',e=>{if(mode==='fly'){e.preventDefault();camera.position.addScaledVector(forward,-e.deltaY*.07);safe(camera.position);}},{passive:false});
 const inputTarget=el=>/INPUT|SELECT|TEXTAREA|BUTTON/.test(el?.tagName||'')||document.querySelector('dialog[open]');
 window.addEventListener('keydown',e=>{if(inputTarget(e.target))return;if(e.code==='KeyH')overview();if(e.code==='KeyF')setMode(mode==='fly'?'spot':'fly');if(mode==='fly'&&['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();velocity.set(0,0,0);});
 const touchKeys={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',up:'KeyE',down:'KeyQ'};
 for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(touchKeys[b.dataset.move]);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(touchKeys[b.dataset.move]));}
 const api={orbit,places,safe,setMode,overview,place,stone,train,get mode(){return mode;},get selected(){return selected;},get transitioning(){return !!tween;},update(dt){
  if(tween){const t=tween;t.time+=dt;const u=Math.min(1,t.time/t.duration),e=u*u*(3-2*u);camera.position.lerpVectors(t.from,t.to,e);orbit.target.lerpVectors(t.targetFrom,t.targetTo,e);safe(camera.position);camera.lookAt(orbit.target);if(u===1)tween=null;}
  else if(mode==='fly'){
   camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);camera.getWorldDirection(forward);right.crossVectors(forward,camera.up).normalize();
   const altitude=camera.position.y-ground.height(camera.position.x,camera.position.z),speed=THREE.MathUtils.clamp(altitude*.65,7,1700)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.5:1),wanted=new THREE.Vector3();
   if(keys.has('KeyW'))wanted.add(forward);if(keys.has('KeyS'))wanted.sub(forward);if(keys.has('KeyD'))wanted.add(right);if(keys.has('KeyA'))wanted.sub(right);if(keys.has('KeyE'))wanted.y+=1;if(keys.has('KeyQ'))wanted.y-=1;if(wanted.lengthSq())wanted.normalize().multiplyScalar(speed);
   velocity.lerp(wanted,1-Math.exp(-dt*5));camera.position.addScaledVector(velocity,dt);safe(camera.position);orbit.target.copy(camera.position).addScaledVector(forward,Math.max(20,altitude*.5));
  }else {orbit.update();safe(camera.position);}
  const distance=camera.position.distanceTo(orbit.target);camera.near=mode==='fly'||distance<300? .3:distance<3000?1:10;camera.far=Math.max(85000,Math.min(200000,distance*4));camera.updateProjectionMatrix();
 }};return api;
}
