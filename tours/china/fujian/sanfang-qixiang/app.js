import * as THREE from 'three';
import {buildScene} from './scene.js';
import {toLocal,toLonLat,nearestRoad,makeCollision} from './geo.js';
import {Navigation} from './navigation.js';

const $=s=>document.querySelector(s),canvas=$('#view');
async function read(path){const r=await fetch(path);if(!r.ok)throw Error(path+' 返回 HTTP '+r.status);return r.json();}
function progress(value,message){$('#progress').value=value;$('#load-message').textContent=message;}
const [data,sources]=await Promise.all([read('./data/site.json'),read('./data/sources.json')]);
progress(18,'核实 '+data.summary.buildings+' 个独立建筑轮廓…');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false,logarithmicDepthBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.showFailure('WebGL 上下文已丢失。可关闭其他占用显存的页面后重新加载，或选用节能画质。');});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe0e7e9);scene.fog=new THREE.Fog(0xe0e7e9,1250,2350);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.12,2400);camera.position.set(340,650,900);
const hemi=new THREE.HemisphereLight(0xe9edf1,0xb4b0a4,2.8);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff8eb,1.85);sun.position.set(-150,240,-105);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=720;sun.shadow.normalBias=.035;sun.shadow.bias=-.00008;sun.shadow.radius=3;scene.add(sun,sun.target);
const ambient=new THREE.AmbientLight(0xefeee8,.5);scene.add(ambient);
const world=await buildScene(scene,data,progress),collision=makeCollision(data,world.extras),nav=new Navigation(camera,canvas,collision);
if(world.warnings.length){$('#warning').hidden=false;$('#warning').textContent=world.warnings.join(' ');}
let quality=matchMedia('(pointer:coarse)').matches?'low':'medium',showLabels=true,evidence=false,frames=0,perfStart=performance.now(),last=performance.now(),uiLast=0,shadowLast=0;
function applyQuality(value){quality=value;const profiles={low:{dpr:1,shadow:1024},medium:{dpr:Math.min(devicePixelRatio,1.5),shadow:2048},high:{dpr:Math.min(devicePixelRatio,2),shadow:4096}},p=profiles[value];renderer.setPixelRatio(p.dpr);sun.shadow.mapSize.set(p.shadow,p.shadow);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;$('#quality').value=value;resize();}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();nav.moved=true;}window.addEventListener('resize',resize);applyQuality(quality);

const main=data.roads.find(r=>r.name==='南后街');
const landmarkDefinitions=[
 {id:'north',name:'南后街北口',note:'牌坊 · 照片近似',point:toLocal(119.291497,26.08855),target:toLocal(119.29154,26.0882)},
 {id:'langguan',name:'郎官巷',note:'街巷折线 · OSM',point:main.points.find((p,i)=>main.nodeIds[i]==='3075216468')||data.roads.find(r=>r.name==='郎官巷').points[0],target:data.roads.find(r=>r.name==='郎官巷').points[3]},
 {id:'ta',name:'塔巷',point:data.roads.find(r=>r.name==='塔巷').points[0],target:data.roads.find(r=>r.name==='塔巷').points[3]},
 {id:'yijin',name:'衣锦坊 / 黄巷',point:data.roads.find(r=>r.name==='黄巷').points[0],target:data.roads.find(r=>r.name==='衣锦坊').points.at(-4)},
 {id:'ye',name:'叶氏民居附近',note:'立面候选映射 · 待核准',point:[7.9,27.8],target:[-4.8,30.4,4.1]},
 {id:'tree',name:'爱心树附近',note:'树位、树冠 · 照片近似',point:toLocal(119.292248,26.084879),target:[16.1,106,4.1]},
 {id:'wenru',name:'文儒坊 / 安民巷',point:data.roads.find(r=>r.name==='文儒坊').points.at(-1),target:data.roads.find(r=>r.name==='文儒坊').points.at(-4)},
 {id:'gong',name:'宫巷',point:data.roads.find(r=>r.name==='宫巷').points[0],target:data.roads.find(r=>r.name==='宫巷').points[3]},
 {id:'south',name:'光禄坊 / 吉庇巷',point:main.points.at(-1),target:data.roads.find(r=>r.name==='吉庇巷').points[1]}
];
function jump(id,forceMode){const place=landmarkDefinitions.find(p=>p.id===id);if(!place)return;const mode=forceMode||nav.mode;if(mode==='walk'){nav.walkTo(place.point,place.target);}else{nav.fly([place.point[0]+80,105,place.point[1]+115],place.point,'aerial');}$('#location').textContent=place.name;$('#info').hidden=true;$('#info-toggle').setAttribute('aria-expanded','false');}
for(const [i,place] of landmarkDefinitions.entries()){const button=document.createElement('button');button.dataset.place=place.id;button.title=place.note||'OSM 街巷位置，街宽为估算';button.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span><b>'+place.name+'</b><em>↗</em>';button.onclick=()=>jump(place.id);$('#destinations').append(button);}
$('#aerial').onclick=()=>nav.aerial();$('#walk').onclick=()=>jump('tree','walk');$('#look').onclick=()=>nav.lock();
$('#quality').onchange=e=>applyQuality(e.target.value);
$('#labels-toggle').onclick=()=>{showLabels=!showLabels;$('#labels-toggle').setAttribute('aria-pressed',String(showLabels));$('#labels').hidden=!showLabels;};
$('#evidence-toggle').onclick=()=>{evidence=!evidence;world.setEvidence(evidence);$('#evidence-toggle').setAttribute('aria-pressed',String(evidence));$('#location').textContent=evidence?'青色：地图道路 / 褐色：照片近似 / 灰色：缺立面':'全区鸟瞰';};
function toggleInfo(open){$('#info').hidden=!open;$('#info-toggle').setAttribute('aria-expanded',String(open));nav.keys.clear();if(document.pointerLockElement)document.exitPointerLock();}
$('#info-toggle').onclick=()=>toggleInfo($('#info').hidden);$('#info-close').onclick=()=>toggleInfo(false);
$('#places-toggle').onclick=()=>{const body=$('#places-body'),open=body.hidden;body.hidden=!open;$('#places-toggle').setAttribute('aria-expanded',String(open));$('#places-toggle span').textContent=open?'−':'+';};
$('#data-summary').innerHTML='<b>'+data.summary.buildings+' 个建筑轮廓 · '+data.summary.roads+' 条道路折线</b><br>南后街中心线长 '+data.summary.nanhouLength+' m（数据计算）<br>'+data.summary.sampleBuildings+' 个轮廓位于样板范围<br>OSM 高度标签：'+data.summary.osmHeights+' 个；层数标签：'+data.summary.osmLevels+' 个<br>绝大多数高度、全部屋顶结构与街宽为估算。';
const photoPlaces={'north-gate-2023.jpg':'north','nanhou-north-2023.jpg':'north','heart-tree-2023.jpg':'tree','ye-residence-2023.jpg':'ye'};
for(const source of sources){const div=document.createElement('article');div.className='reference';const img=document.createElement('img');img.src='./'+source.file;img.alt=source.title;img.loading='lazy';img.onerror=()=>{img.alt='参考照片加载失败：'+source.file;};div.append(img);const p=document.createElement('p');p.textContent=source.date+' · '+source.author+' · '+source.license+(source.use==='historical-layout-only'?' · 仅作历史布局参考':'');div.append(p);const a=document.createElement('a');a.href=source.page;a.target='_blank';a.rel='noopener';a.textContent='照片及许可原页 ↗';div.append(a);if(photoPlaces[source.file.split('/').at(-1)]){const button=document.createElement('button');button.textContent='转到近似拍摄机位';button.style.marginLeft='15px';button.onclick=()=>jump(photoPlaces[source.file.split('/').at(-1)],'walk');div.append(button);}$('#references').append(div);}

const labelItems=[];for(const name of ['南后街','衣锦坊','文儒坊','光禄坊','郎官巷','塔巷','黄巷','安民巷','宫巷','吉庇巷']){const road=data.roads.find(r=>r.name===name);if(!road)continue;let point=road.points[Math.floor(road.points.length/2)];const div=document.createElement('div');div.className='label';div.textContent=name;$('#labels').append(div);labelItems.push({div,position:new THREE.Vector3(point[0],3.2,point[1])});}
const map=$('#minimap'),ctx=map.getContext('2d'),mapBase=document.createElement('canvas');mapBase.width=mapBase.height=520;const mapCtx=mapBase.getContext('2d');const bounds=data.bounds,scale=Math.min(480/(bounds[2]-bounds[0]),480/(bounds[3]-bounds[1]));const mapPoint=p=>[20+(p[0]-bounds[0])*scale,20+(p[1]-bounds[1])*scale];
mapCtx.fillStyle='#f0f0e5';mapCtx.fillRect(0,0,520,520);
for(const b of data.buildings){mapCtx.beginPath();b.footprint.forEach((p,i)=>{const [x,y]=mapPoint(p);if(i===0)mapCtx.moveTo(x,y);else mapCtx.lineTo(x,y);});mapCtx.closePath();mapCtx.fillStyle=b.sample?'#90a57e':'#c6ccbc';mapCtx.fill();}
for(const r of data.roads){mapCtx.beginPath();r.points.forEach((p,i)=>{const [x,y]=mapPoint(p);i?mapCtx.lineTo(x,y):mapCtx.moveTo(x,y);});mapCtx.lineWidth=Math.max(1.2,r.width*scale);mapCtx.strokeStyle='#fffef7';mapCtx.lineJoin='round';mapCtx.stroke();}
mapCtx.font='17px Microsoft YaHei';mapCtx.fillStyle='#637159';for(const name of ['衣锦坊','文儒坊','郎官巷','塔巷','黄巷','安民巷','宫巷','吉庇巷']){const road=data.roads.find(r=>r.name===name);const p=mapPoint(road.points[Math.floor(road.points.length*.6)]);mapCtx.fillText(name,p[0]-18,p[1]-4);}
mapCtx.strokeStyle='#697961';mapCtx.lineWidth=3;mapCtx.beginPath();mapCtx.moveTo(22,497);mapCtx.lineTo(22+100*scale,497);mapCtx.stroke();mapCtx.font='12px monospace';mapCtx.fillStyle='#697961';mapCtx.fillText('0',22,513);mapCtx.fillText('100 m',22+100*scale,513);
function drawMap(){ctx.drawImage(mapBase,0,0);const position=nav.mode==='walk'?camera.position:nav.orbit.target,[x,z]=mapPoint([position.x,position.z]),dir=new THREE.Vector3();camera.getWorldDirection(dir);ctx.fillStyle='#526f51';ctx.beginPath();ctx.arc(x,z,6,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,z);ctx.rotate(Math.atan2(dir.x,-dir.z));ctx.fillStyle='#526f5144';ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(-17,-42);ctx.lineTo(17,-42);ctx.closePath();ctx.fill();ctx.restore();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,z,6,0,Math.PI*2);ctx.stroke();}
map.addEventListener('pointerdown',e=>{const rect=map.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*520,z=(e.clientY-rect.top)/rect.height*520,point=[(x-20)/scale+bounds[0],(z-20)/scale+bounds[1]],hit=nearestRoad(point,data.roads);if(nav.mode==='walk'){const next=hit.road.points[hit.index],previous=hit.road.points[hit.index-1],target=Math.hypot(next[0]-hit.point[0],next[1]-hit.point[1])<1?previous:next;nav.walkTo(hit.point,target);}else nav.fly([hit.point[0]+90,120,hit.point[1]+150],hit.point,'aerial');});
function updateUI(){
 const dir=new THREE.Vector3();camera.getWorldDirection(dir);const position=nav.mode==='walk'?camera.position:nav.orbit.target,lonlat=toLonLat(position.x,position.z);$('#coordinates').textContent=lonlat[1].toFixed(5)+'° N · '+lonlat[0].toFixed(5)+'° E'+(nav.transitioning?' · 机位过渡':nav.mode==='walk'?' · 眼高 1.65 m':' · 米制场景');
 if(!evidence&&!nav.transitioning){const closest=nearestRoad([position.x,position.z],data.roads.filter(r=>r.name!=='未命名支路'));$('#location').textContent=nav.mode==='walk'?closest.road.name+' · 步行':'全区 / 局部鸟瞰';}
 for(const label of labelItems){const d=camera.position.distanceTo(label.position),p=label.position.clone().project(camera),front=new THREE.Vector3().subVectors(label.position,camera.position).dot(dir)>0;label.div.hidden=!showLabels||!front||p.z>1||p.z<-1||(nav.mode==='walk'&&d>90);if(!label.div.hidden){label.div.style.left=(p.x*.5+.5)*innerWidth+'px';label.div.style.top=(-p.y*.5+.5)*innerHeight+'px';}}
 drawMap();
}
function updateShadow(){const walking=nav.mode==='walk',focus=walking?camera.position:nav.orbit.target,extent=walking?65:470;sun.position.set(focus.x-150,240,focus.z-105);sun.target.position.set(focus.x,0,focus.z);sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});sun.shadow.camera.updateProjectionMatrix();}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;nav.update(dt,now);world.update(camera,nav.mode,quality);if(now-shadowLast>250||nav.transitioning){updateShadow();shadowLast=now;}renderer.render(scene,camera);frames++;if(now-uiLast>120){updateUI();uiLast=now;}if(now-perfStart>1500){const fps=frames*1000/(now-perfStart);$('#perf').textContent=Math.round(fps)+' FPS · '+renderer.info.render.calls+' calls';frames=0;perfStart=now;}}
$('#capture').onclick=()=>{renderer.render(scene,camera);canvas.toBlob(blob=>{if(!blob){window.showFailure('截图编码失败');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='sanfang-qixiang-'+nav.mode+'-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});};
window.__sanfang={ready:true,data,sources,scene,camera,renderer,world,nav,collision,jump,toLocal,toLonLat,quality:()=>quality,setQuality:applyQuality};
progress(100,'场景准备就绪');updateShadow();renderer.render(scene,camera);$('#loading').hidden=true;requestAnimationFrame(animate);
