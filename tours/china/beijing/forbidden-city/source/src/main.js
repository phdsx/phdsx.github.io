import './style.css';
import * as THREE from 'three';
import {materials} from './materials.js';
import {buildBuildings} from './buildings.js';
import {terrain,terraceSteps} from './terrain.js';
import {lighting} from './lighting.js';
import {rendering} from './rendering.js';
import {Navigation} from './controls.js';
import {DetailManager,QUALITY} from './performance.js';
import {UI,$,toast} from './ui.js';
async function start(){
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{throw new Error('WebGL 2 不可用。请启用硬件加速或使用支持 WebGL 2 的浏览器。');}
 renderer.domElement.className='scene';$('viewport').prepend(renderer.domElement);renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形上下文丢失。请降低画质后刷新。');$('boot-error').textContent='图形上下文丢失，请刷新页面重建场景。';$('boot-error').classList.remove('hidden');});
 const fetchJSON=async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`资源加载失败 ${url} (${r.status})`);return r.json();};
 const [data,landmarks,sources]=await Promise.all(['data/layout.json','data/landmarks.json','data/sources.json'].map(fetchJSON));$('progress').value=12;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.15,14000),mats=materials();const lights=lighting(scene,renderer);$('loading-title').textContent='建立城墙、水系与院落';const landscape=terrain(scene,data,mats);$('progress').value=25;$('loading-title').textContent='生成全域建筑与地标';
 const building=await buildBuildings(scene,data,landmarks,mats,p=>$('progress').value=25+p*65);const steps=terraceSteps(scene,building.platforms,mats);landscape.ramps.push(...steps.ramps);building.groups.push(steps.group);
 for(const p of building.picks)scene.add(p);
 const pipeline=rendering(renderer,scene,camera,[lights.sky,...building.picks]);
 const nav=new Navigation(camera,renderer.domElement,building,landscape,toast);nav.home();const ui=new UI(data,building,nav,camera,renderer);const details=new DetailManager(scene,building.models,mats);let quality='medium',gray=false;const original=new Map();scene.traverse(o=>{if(o.isMesh&&o!==lights.sky&&!building.picks.includes(o))original.set(o,o.material);});
 $('gray').onclick=()=>{gray=!gray;$('gray').setAttribute('aria-pressed',gray);for(const [o,m] of original)o.material=gray?mats.gray:m;if(gray)for(const group of details.cache.values())group.visible=false;};
 $('quality').onchange=()=>{quality=$('quality').value;renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY[quality].dpr));renderer.shadowMap.enabled=QUALITY[quality].shadows;pipeline.resize();toast(`${{low:'低',medium:'中',high:'高'}[quality]}画质：细部距离 ${QUALITY[quality].details} 米`);};
 $('source-content').innerHTML=`<p>${landmarks.baseline}</p><p><strong>单位：1 世界单位 = 1 米。</strong>原点为城墙矩形中心，x 沿南墙向东，z 沿西墙向南。格网北与真北约差 2.04°。地图轮廓按官方 753 × 961 米仿射标定；这不构成测绘精度证明。</p><h3>本次还原程度</h3><ul><li>尺寸核对：城池边界、城墙高度、护城河宽度、太和殿主体与台基高度；角楼中央方亭尺寸。</li><li>形制参考：中轴线殿宇、午门、三座其他城门、角楼、文华殿与武英殿。檐曲线、斗栱、格扇、脊饰为参数化近似。</li><li>示意：其余地图建筑轮廓、院墙、道路、树木。未知屋顶使用明确标注的简化模型，没有逐栋核对。</li><li>未还原：所有室内、延禧宫灵沼轩主体、复杂假山、精确彩画/兽饰、部分复合屋顶、临时施工与当日开放区域。</li></ul><p>共 ${data.buildings.length} 条地图建筑/城台/院墙轮廓，不能解读为 ${data.buildings.length} 座已准确复原的建筑。步行范围为研究模型的室外空间，不等同现实参观许可。</p><h3>资料表</h3><table><thead><tr><th>来源</th><th>支持内容 / 可靠度</th></tr></thead><tbody>${sources.sources.map(s=>`<tr><td><a target="_blank" rel="noopener" href="${s.url}">${s.title}</a></td><td>${s.support}<br><small>${s.reliability} · ${s.license}</small></td></tr>`).join('')}</tbody></table><h3>冲突和限制</h3><ul>${sources.conflicts.map(s=>`<li>${s}</li>`).join('')}</ul><p>完整资料、尺寸偏差、参考照片链接和测试报告位于项目 docs/ 与 evidence/。未经许可的官方照片只用于参考核对，运行场景不加载第三方影像。</p>`;
 $('capture').onclick=()=>{pipeline.render(quality);renderer.domElement.toBlob(blob=>{if(!blob){toast('视角保存失败，请刷新重试。');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`forbidden-city-${ui.selected?.id||'view'}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已保存当前三维视角。');},'image/png');};
 let last=performance.now(),frames=0,sum=0,uiTime=0,detailTime=0;const metrics={frames:0,samples:[],calls:0,triangles:0};
 function animate(t){requestAnimationFrame(animate);const elapsed=Math.max(0,(t-last)/1000),dt=Math.min(.05,elapsed);last=t;nav.update(dt);lights.update(camera,quality,nav.mode==='walk',nav.orbit.target);if(t-detailTime>180){details.update(camera,quality,gray).catch(e=>toast(`细部加载失败：${e.message}`));detailTime=t;}pipeline.render(quality);frames++;sum+=elapsed;metrics.frames++;metrics.calls=renderer.info.render.calls;metrics.triangles=renderer.info.render.triangles;if(t-uiTime>120){ui.update();uiTime=t;}if(sum>1){const fps=frames/sum;metrics.samples.push({time:t,fps,calls:metrics.calls,triangles:metrics.triangles});if(metrics.samples.length>180)metrics.samples.shift();$('stats').textContent=`${fps.toFixed(0)} fps · ${metrics.calls} draws · ${(metrics.triangles/1000).toFixed(0)}k 三角形`;frames=sum=0;}}
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);pipeline.resize();ui.update();});
 window.__palace={scene,camera,renderer,nav,ui,data,building,landscape,metrics,details,quality:()=>quality,ready:true};window.__ready=true;$('progress').value=100;$('loading').classList.add('hidden');if(new URLSearchParams(location.search).get('stage')==='2')$('gray').click();animate(performance.now());
}
start().catch(e=>{$('loading-title').textContent='场景加载失败';$('loading-note').textContent=e.message;$('boot-error').classList.remove('hidden');$('boot-error').textContent=e.message;console.error(e);});
