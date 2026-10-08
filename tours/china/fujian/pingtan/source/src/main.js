import * as THREE from 'three';
import {Assets} from './load.js';
import {createTerrain} from './terrain.js';
import {createOcean} from './ocean.js';
import {createMaterials} from './materials.js';
import {createFeatures} from './features.js';
import {createVillage,createVegetation,createTurbines} from './details.js';
import {createLighting} from './lighting.js';
import {createNavigation} from './navigation.js';
import {createUI,navigationUI} from './ui.js';
import {createCoasts} from './coasts.js';
import {createTrain} from './train.js';
import {createLandmarks} from './landmarks.js';
const $=id=>document.getElementById(id),warnings=[],mobile=matchMedia('(pointer:coarse)').matches||innerWidth<700;
let quality=mobile?'low':'medium',renderer;
function progress(f,message){$('progress').style.width=`${Math.round(f*100)}%`;$('load-count').textContent=`${Math.round(f*100)}%`;$('load-message').textContent=message;}
function warn(message){if(!warnings.includes(message))warnings.push(message);$('error-banner').hidden=false;$('error-message').textContent=warnings.join('；');}
async function boot(){
 // The same static build runs independently and inside the website directory.
 // Link the existing identity back to its region only in the site context.
 if(/\/tours\/china\/fujian\/pingtan\/(?:index\.html)?$/.test(location.pathname)){
  const identity=document.querySelector('.identity');
  identity.href='../../../../tours.html?country=china&region=fujian';
  identity.title='返回3D云游 · 福建';identity.setAttribute('aria-label','返回3D云游 · 中国 · 福建');
  identity.querySelector('small').textContent='← 3D云游 · 福建 / 海坛岛';
 }
 progress(.02,'读取真实地理资料');const assets=new Assets(progress,warn);
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:mobile?'default':'high-performance',preserveDrawingBuffer:true});}
 catch(e){throw Error('无法创建 WebGL 2 场景。请检查浏览器硬件加速、显卡驱动或改用支持 WebGL 2 的浏览器。'+e.message);}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.4));$('viewport').appendChild(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();warn('显卡上下文中断，场景已暂停。请降低其他页面负载后重新加载。');});renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
 const data=await assets.base(quality==='low');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,10,140000),ground=createTerrain(scene,data),ocean=createOcean(scene,data);
 progress(.89,'正在建立天空、日光与真实尺度地形');const lighting=createLighting(scene,renderer),nav=createNavigation(camera,renderer.domElement,ground,data,navigationUI);
 progress(.93,'正在制作北港石厝局部样板');const materials=await createMaterials(assets);ground.setGrain(materials.forest.map);const features=createFeatures(scene,data,ground),village=createVillage(scene,data,ground,materials),vegetation=createVegetation(scene,data,ground,materials),turbines=createTurbines(scene,data,ground,materials);
 const coasts=createCoasts(scene,data,ground,materials),train=createTrain(scene,data,ground),landmarks=createLandmarks(scene,data,ground,materials);
 nav.trainFocus=train.focus;
 const profiles={low:{dpr:1,shadow:0},medium:{dpr:mobile?1.15:1.4,shadow:1024},high:{dpr:mobile?1.3:1.8,shadow:2048}};
 async function setQuality(q){quality=q;$('quality').value=q;const p=profiles[q];renderer.setPixelRatio(Math.min(devicePixelRatio,p.dpr));if(p.shadow&&lighting.sun.shadow.mapSize.x!==p.shadow){lighting.sun.shadow.mapSize.set(p.shadow,p.shadow);lighting.sun.shadow.map?.dispose();lighting.sun.shadow.map=null;}if(q!=='low'&&data.satellite?.image?.width<2048){const tex=await assets.texture('./data/satellite-2016.webp');if(tex){ground.material.map=tex;ground.material.needsUpdate=true;}}}
 setQuality(quality);navigationUI({mode:'overview',selected:null});if(mobile){$('places-panel').classList.add('folded');$('places-toggle').setAttribute('aria-expanded','false');$('places-toggle').querySelector('.chevron').textContent='+';}lighting.update(camera,nav.orbit.target,quality);const ui=createUI(nav,camera,renderer,data,lighting,setQuality,()=>quality,warn);
 window.__pingtan={ready:false,THREE,scene,camera,renderer,data,ground,ocean,lighting,nav,ui,features,village,vegetation,turbines,coasts,train,landmarks,warnings,quality:()=>quality,setQuality};
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=performance.now();});
 let last=performance.now(),elapsed=0,fps=60,frame=0;
 function render(now){
  if(renderer.getContext().isContextLost())return;const raw=(now-last)/1000,dt=Math.min(.06,Math.max(0,raw));last=now;elapsed+=dt;
  if(raw>0&&raw<.5)fps=fps*.95+.05/raw;
  nav.update(dt);ground.update(camera,quality);features.update(camera,quality);village.update(camera,quality);vegetation.update(camera,quality);turbines.update(elapsed,camera,quality);ocean.update(elapsed);ocean.uniforms.sunVector.value.copy(lighting.sun.position).sub(lighting.sun.target.position).normalize();
  coasts.update(camera,quality);train.update(elapsed,camera,quality);
  landmarks.update(camera,quality,elapsed);
  if(++frame%4===0)lighting.update(camera,nav.orbit.target,quality);
  ui.update(fps,ground);renderer.render(scene,camera);requestAnimationFrame(render);
 }
 progress(1,'海坛岛已展开');requestAnimationFrame(render);window.__pingtan.ready=true;$('loading').classList.add('complete');setTimeout(()=>{$('loading').hidden=true;},850);
 if(new URLSearchParams(location.search).has('place'))nav.place(new URLSearchParams(location.search).get('place'));
}
boot().catch(e=>{console.error(e);progress(0,'加载失败，请查看下方错误说明');warn(e.message+'。请通过 HTTP 服务运行，并确认 data 目录完整。');});
window.addEventListener('unhandledrejection',e=>warn('运行错误：'+(e.reason?.message||String(e.reason))));
