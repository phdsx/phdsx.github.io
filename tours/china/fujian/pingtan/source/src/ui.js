import * as THREE from 'three';
import {unproject} from './geo.js';
const $=id=>document.getElementById(id);
export function navigationUI(state){
 const {mode,selected,stone}=state;
 $('overview').classList.toggle('active',mode==='overview');$('overview').setAttribute('aria-pressed',mode==='overview');$('fly').classList.toggle('active',mode==='fly');$('fly').setAttribute('aria-pressed',mode==='fly');$('close-view').classList.toggle('active',mode==='spot');
 for(const b of document.querySelectorAll('[data-place]'))b.classList.toggle('selected',b.dataset.place===selected?.id);
 $('location-title').textContent=selected?.name||'海坛岛';$('location-description').textContent=stone?'已映射轮廓上的石厝外观样板。6 米墙高、窗门与瓦顶为近似，非该民宿的实测复刻。':selected?.description||'循着海岸线，看山、村落与海。';$('accuracy-chip').textContent=selected?.accuracy||'真实地理数据 · 全岛';
 const [lon,lat]=selected?.lonLat||[119.78,25.53];$('location-kicker').textContent=`${selected?.positionClass==='approximate'?'区域约位 · ':''}${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
 const ref=$('landmark-reference');ref.hidden=!selected?.references?.length;if(!ref.hidden)ref.href=selected.references[0];
 $('stone-close').hidden=selected?.id!=='beigang'||stone||mode==='fly';$('touch-flight').hidden=mode!=='fly'||!matchMedia('(pointer:coarse)').matches;
 $('train-close').hidden=selected?.id!=='longwang'||state.train||mode==='fly';
 $('navigation-hint').textContent=mode==='fly'?'拖动视线 · WASD 移动 · Q / E 高度 · Shift 加速':'拖动旋转 · 滚轮 / 双指缩放 · 右键 / 双指平移';
}
export function createUI(nav,camera,renderer,data,lighting,qualityFn,qualityGet,warn){
 const list=$('place-list'),regions={beigang:'东岸',changjiang:'北岸',longwang:'东岸',offshore:'北岸',tannan:'南岸','north-rock':'北岸'},types={beigang:'石厝聚落',changjiang:'弧形沙湾 · 风车田',longwang:'宽沙滩 · 观光车',offshore:'近海风机',tannan:'浅色沙湾','north-rock':'生态廊道 · 岬角',cave:'黑礁 · 海蚀洞',well:'竖井 · 陡壁 · 涌潮',pillars:'礁盘 · 双石帆','granite-islet':'岩岛 · 海峡','sand-spit':'狭长沙堤 · 双面海',peak:'真实高程 · 山海',harbour:'渔港 · 精模暂缺','weathered-rocks':'花岗岩低丘 · 近似'};
 let number=0;
 for(const region of ['北岸','东岸','南岸','西岸','内陆']){
  const heading=document.createElement('div');heading.className='region-heading';heading.textContent=region;list.append(heading);
  for(const p of nav.places.filter(p=>(p.region||regions[p.id])===region)){
   const b=document.createElement('button');b.dataset.place=p.id;b.className='place-card';b.setAttribute('aria-label',p.name+'，'+p.accuracy);
   const n=document.createElement('span');n.className='place-number';n.textContent=String(++number).padStart(2,'0');const text=document.createElement('span'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=p.name;sub.textContent=types[p.id]||types[p.kind]||p.accuracy;text.append(title,sub);const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';b.append(n,text,arrow);list.append(b);
  }
 }
 $('place-search').oninput=e=>{const q=e.target.value.trim();list.querySelectorAll('[data-place]').forEach(b=>b.hidden=!b.textContent.includes(q));list.querySelectorAll('.region-heading').forEach(h=>h.hidden=!!q);};
 const inventory=$('landscape-inventory');for(const p of data.landmarks.inventory){const item=document.createElement('li'),title=document.createElement('b'),detail=document.createElement('span');title.textContent=p.name+' · '+p.status;detail.textContent=p.missing;item.append(title,detail);inventory.append(item);}
 $('landscape-open').onclick=()=>{$('sources-dialog').showModal();$('landscape-inventory').scrollIntoView({block:'start'});};
 $('overview').onclick=()=>nav.overview();$('fly').onclick=()=>nav.setMode(nav.mode==='fly'?'spot':'fly');$('close-view').onclick=()=>nav.place(nav.selected?.id||'beigang',true);$('stone-close').onclick=()=>nav.stone();
 $('train-close').onclick=()=>nav.train();
 document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>nav.place(b.dataset.place));
 $('places-toggle').onclick=()=>{const f=$('places-panel').classList.toggle('folded');$('places-toggle').setAttribute('aria-expanded',!f);$('places-toggle').querySelector('.chevron').textContent=f?'+':'−';};
 $('map-toggle').onclick=()=>{const f=$('map-panel').classList.toggle('folded');$('map-toggle').setAttribute('aria-expanded',!f);$('map-toggle').textContent=f?'+':'−';};
 $('help-open').onclick=()=>$('help-dialog').showModal();$('sources-open').onclick=()=>$('sources-dialog').showModal();document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 $('fullscreen').onclick=()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p?.catch(e=>warn('浏览器不允许全屏：'+e.message));};
 $('quality').onchange=e=>qualityFn(e.target.value);let timer;
 $('time').oninput=e=>{const hour=+e.target.value,m=Math.round((hour%1)*60);$('time-output').textContent=`${String(Math.floor(hour)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;clearTimeout(timer);timer=setTimeout(()=>{const s=lighting.setTime(hour);$('sun-elevation').textContent=`太阳高度 ${s.elevation.toFixed(0)}°`;},120);};
 $('screenshot').onclick=()=>{try{renderer.render(window.__pingtan.scene,camera);renderer.domElement.toBlob(blob=>{if(!blob){warn('截图失败，浏览器未返回图像。');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pingtan-${nav.selected?.id||'overview'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}catch(e){warn('截图失败：'+e.message);}};
 $('retry').onclick=()=>location.reload();
 $('data-stats').textContent=`已加载：${data.geo.coastlines[data.geo.mainIsland].length.toLocaleString()} 个主岛岸线节点 · ${data.geo.roads.length.toLocaleString()} 条映射道路 · ${data.geo.buildings.length} 个建筑轮廓 · ${data.geo.turbines.length} 个风机点位。主岛当前轮廓面积约 ${(data.geo.metadata.mainAreaM2/1e6).toFixed(1)} km²，属于本次 OSM 轮廓的计算值。`;
 const labelList=[];
 function label(name,x,z,minor=false,id){const el=document.createElement('span');el.className='geo-label'+(minor?' minor':'');el.textContent=name;$('labels').appendChild(el);labelList.push({el,x,z,minor,id});}
 nav.places.forEach(p=>label(p.name,p.x,p.z,false,p.id));
 for(const p of data.geo.places.filter(p=>p.tags.place==='town'))label(p.tags.name,p.x,p.z,true);
 // The mapped main elevation maximum supplies the peak marker, not an invented hill.
 let max=-1,idx=0;for(let i=0;i<data.surface.length;i++)if(data.land[i]&&data.surface[i]>max){max=data.surface[i];idx=i;}
 const peakX=data.meta.x0+(idx%data.meta.nx)*40,peakZ=data.meta.z0+Math.floor(idx/data.meta.nx)*40;
 $('labels-toggle').onchange=e=>$('labels').hidden=!e.target.checked;
 const map=$('minimap'),ctx=map.getContext('2d'),bb=data.geo.metadata.mainBBox,padding=25,scale=Math.min((320-padding*2)/(bb[2]-bb[0]),(380-padding*2)/(bb[3]-bb[1])),ox=(320-(bb[2]+bb[0])*scale)/2,oy=(380-(bb[3]+bb[1])*scale)/2;
 $('map-scale').style.width=`${5000*scale/320*100}%`;
 const mapPoint=(x,z)=>[ox+x*scale,oy+z*scale],worldPoint=(x,y)=>[(x-ox)/scale,(y-oy)/scale];
 map.onclick=e=>{const r=map.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*320,y=(e.clientY-r.top)/r.height*380;let best=null,d=30;for(const p of nav.places){const [xx,yy]=mapPoint(p.x,p.z),dd=Math.hypot(x-xx,y-yy);if(dd<d){d=dd;best=p;}}if(best)nav.place(best.id);};
 function drawMap(){
  ctx.clearRect(0,0,320,380);ctx.fillStyle='#527263';ctx.strokeStyle='#a0b4a0';ctx.lineWidth=.8;
  for(const p of data.geo.coastlines){ctx.beginPath();p.forEach((v,i)=>{const [x,y]=mapPoint(...v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.fill();ctx.stroke();}
  for(const p of nav.places){const [x,y]=mapPoint(p.x,p.z);ctx.beginPath();ctx.arc(x,y,nav.selected===p?5:3.5,0,Math.PI*2);ctx.fillStyle=nav.selected===p?'#f0e7bb':'#d4dec8';ctx.fill();}
  const [x,y]=mapPoint(camera.position.x,camera.position.z),dir=new THREE.Vector3();camera.getWorldDirection(dir);ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dir.x,-dir.z));ctx.fillStyle='#eee9cb';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-4,5);ctx.lineTo(0,3);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();
 }
 let ticks=0;const vec=new THREE.Vector3(),normal=new THREE.Vector3();
 return {labels:labelList,peak:{x:peakX,z:peakZ,height:max},mapPoint,update(fps,ground){
  if(++ticks%6)return;
  const altitude=camera.position.y-ground.height(camera.position.x,camera.position.z);$('height-readout').textContent=`离地 ${altitude>=1000?(altitude/1000).toFixed(1)+' km':Math.round(altitude)+' m'}`;$('perf-readout').textContent=`${Math.round(fps)} FPS · ${qualityGet()==='low'?'轻量':qualityGet()==='high'?'精细':'标准'}`;
  const occupied=[];for(const p of [...labelList].sort((a,b)=>(b.id===nav.selected?.id)-(a.id===nav.selected?.id))){vec.set(p.x,ground.height(p.x,p.z)+20,p.z);normal.copy(vec).sub(camera.position);const dist=normal.length();vec.project(camera);const sx=(vec.x*.5+.5)*innerWidth,sy=(-vec.y*.5+.5)*innerHeight;let hidden=vec.z>1||vec.z<-1||Math.abs(vec.x)>1||Math.abs(vec.y)>1||(p.minor&&dist<1700)||(nav.selected&&p.minor&&dist>6000)||dist<120||(nav.selected&&camera.position.y<400&&p.id!==nav.selected.id&&dist>1500)||occupied.some(v=>Math.abs(sx-v[0])<100&&Math.abs(sy-v[1])<30);
   if(!hidden)occupied.push([sx,sy]);
   p.el.classList.toggle('hidden',hidden);if(!hidden){p.el.style.left=`${(vec.x*.5+.5)*innerWidth}px`;p.el.style.top=`${(-vec.y*.5+.5)*innerHeight}px`;}
  }drawMap();
 }};
}
