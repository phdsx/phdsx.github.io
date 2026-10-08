import * as THREE from 'three';
import {Batch,polygon,roof,inside} from './geometry.js';
function area(p){let a=0;for(let i=1;i<p.length;i++)a+=p[i-1][0]*p[i][1]-p[i][0]*p[i-1][1];return Math.abs(a)/2;}
const terraces={'osm-638449433':8.13,'osm-638460849':8.13,'osm-638467894':8.13,'osm-638981252':2,'osm-638981261':2};
function platformGeometry(batch,points,holes,height,y=0){
 const geometry=polygon(points,holes,height);
 for(const part of geometry.groups){const split=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(geometry.attributes))split.setAttribute(name,new THREE.BufferAttribute(attribute.array.slice(part.start*attribute.itemSize,(part.start+part.count)*attribute.itemSize),attribute.itemSize));if(part.materialIndex===0){const uv=split.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);}batch.add(split,part.materialIndex===0?'pave':'stone',0,y,0);}
 geometry.dispose();
}
// Conservative rectangular roof decomposition for L/T shaped cartographic footprints.
function rectangles(b){const a=area(b.points);if(a/(b.w*b.d)>.78&&b.holes.length===0)return[{x:b.x,z:b.z,w:b.w,d:b.d}];const step=2.5,nx=Math.max(1,Math.ceil(b.w/step)),nz=Math.max(1,Math.ceil(b.d/step)),dx=b.w/nx,dz=b.d/nz,minx=b.x-b.w/2,minz=b.z-b.d/2;
 const grid=Array.from({length:nz},(_,j)=>Array.from({length:nx},(_,i)=>{const x=minx+(i+.5)*dx,z=minz+(j+.5)*dz;return inside(x,z,b.points)&&!b.holes.some(h=>inside(x,z,h));}));const out=[];
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)if(grid[j][i]){let n=1;while(i+n<nx&&grid[j][i+n])n++;let m=1;outer:while(j+m<nz){for(let k=0;k<n;k++)if(!grid[j+m][i+k])break outer;m++;}for(let y=j;y<j+m;y++)for(let x=i;x<i+n;x++)grid[y][x]=false;out.push({x:minx+(i+n/2)*dx,z:minz+(j+m/2)*dz,w:n*dx,d:m*dz});}return out;
}
export async function buildBuildings(scene,data,landmarks,mats,progress){
 const configs=new Map(landmarks.items.flatMap(x=>[x.name,...(x.aliases||[])].map(name=>[name,x]))),chunks=new Map(),colliders=[],platforms=[],models=[],picks=[];
 const get=(x,z)=>{const key=`${Math.floor(x/150)},${Math.floor(z/150)}`;if(!chunks.has(key))chunks.set(key,new Batch(mats));return chunks.get(key);};
 const addPlatform=(b,height)=>{const batch=get(b.x,b.z);if(height>5){for(let i=0;i<3;i++){const scale=1-i*.018,points=b.points.map(([x,z])=>[b.x+(x-b.x)*scale,b.z+(z-b.z)*scale]);platformGeometry(batch,points,b.holes,height/3,i*height/3);}}else platformGeometry(batch,b.points,b.holes,height);platforms.push({id:b.id,points:b.points,holes:b.holes,height});};
 for(let i=0;i<data.buildings.length;i++){
 const b=data.buildings[i];if(i%45===0){progress(i/data.buildings.length);await new Promise(r=>requestAnimationFrame(r));}
 const cfg=configs.get(b.name),batch=get(b.x,b.z),ratio=area(b.points)/(b.w*b.d||1),wall=b.tags.building==='wall'||b.name.includes('墙');
 if(wall&&b.name.endsWith('门')){const w=Math.max(b.w,b.d),d=Math.min(b.w,b.d),turn=b.d>b.w;gatePlatform(batch,turn?b.z:b.x,turn?b.x:b.z,w,d,4,colliders,turn);continue;}
 if(wall){batch.add(polygon(b.points,b.holes,3.5),'wall');colliders.push({points:b.points,holes:b.holes,height:3.5,kind:'wall'});continue;}
 if(terraces[b.id]){addPlatform(b,terraces[b.id]);continue;}
 if(b.name==='延禧宫'){batch.add(polygon(b.points,b.holes,1),'stone');colliders.push({points:b.points,holes:b.holes,height:6,kind:'closed'});continue;}
 if(['万春亭','千秋亭'].includes(b.name)){
   const c={x:b.x,z:b.z,w:10.5,d:10.5,h:11,base:.6};batch.box(9,5.6,9,b.x,3.4,b.z,'darkTile');roof(batch,{...c,h:7},'hip',false);
   const profile=[new THREE.Vector2(5.7,0),new THREE.Vector2(5.0,.15),new THREE.Vector2(4,.55),new THREE.Vector2(3,1.25),new THREE.Vector2(2,2.3),new THREE.Vector2(1,3.7),new THREE.Vector2(.25,4.8),new THREE.Vector2(0,4.95)];batch.add(new THREE.LatheGeometry(profile,48),'tile',b.x,6.5,b.z);batch.add(new THREE.SphereGeometry(.55,12,8),'gold',b.x,11.65,b.z);
   for(const axis of [0,1])for(const s of [-1,1])hall(batch,{x:b.x+(axis===0?s*6:0),z:b.z+(axis===1?s*6:0),w:axis===0?3:5,d:axis===0?5:3,h:5.8,base:.6},'gable',false);
   colliders.push({points:b.points,holes:b.holes,height:12,kind:'closed'});continue;
 }
 if(!cfg&&ratio>.78&&b.w*b.d>2800){addPlatform(b,1);continue;}
 if(cfg?.special==='wumen'){
   const x=b.x,z=480.5;gatePlatform(batch,x,z,190,28,12,colliders);for(const side of [-1,1]){batch.box(23,12,80,x+side*82,6,z+47,'wall');colliders.push(rectCollider(x+side*82,z+47,23,80));roof(batch,{x:x+side*82,z:z+42,w:19,d:72,h:8,base:12,yaw:Math.PI/2},'gable',false);for(const zz of [z+3,z+85]){hall(batch,{x:x+side*82,z:zz,w:17,d:17,h:15,base:12},'pyramid',true);}}
   hall(batch,{x,z,w:60,d:25,h:25,base:12},'hip',true);const m={...b,...cfg,x,z,w:60,d:25};m.detailParts=[{...m,special:undefined}];models.push(m);picks.push(pick(m));continue;
 }
 if(['神武门','东华门','西华门'].includes(b.name)){
   const side=b.name!=='神武门',w=side?48:115,d=side?24:26,h=10;
   if(side){gatePlatform(batch,b.z,b.x,115,24,h,colliders,true);hall(batch,{x:b.x,z:b.z,w:45,d:17,h:19,base:10,yaw:Math.PI/2},'hip',true);}else{gatePlatform(batch,b.x,-480.5,w,d,h,colliders);hall(batch,{x:b.x,z:-480.5,w:48,d:18,h:21,base:10},'hip',true);}
   const m={...b,...(cfg||{id:b.name,name:b.name,sourceId:'236502',status:'外观示意；尺寸估算',description:'东西城门的城台、门洞与城楼分开建立。'}),z:side?b.z:-480.5};models.push(m);picks.push(pick(m));continue;
 }
 if(cfg){
   const model={...b,...cfg,w:cfg.w||b.w-3,d:cfg.d||b.d-3,footprintSource:b.source,source:cfg.sourceURL||`https://www.dpm.org.cn/explore/building/${cfg.sourceId}.html`};
   if(cfg.special==='linked-halls'){const depth=(b.d-12)/2;model.detailParts=[];for(const sz of [-1,1]){const part={...model,d:depth,z:b.z+sz*(b.d-depth)/2,special:undefined,detailParts:undefined};hall(batch,part,cfg.roof,false);model.detailParts.push(part);}hall(batch,{...model,w:8,d:14,h:6},'gable',false);colliders.push({points:b.points,holes:b.holes,height:10,kind:'closed'});}
   else{hall(batch,model,cfg.roof,cfg.double,cfg.gate);if(cfg.base&&cfg.base<8){const margin=cfg.platformMargin??8;batch.box(model.w+margin,cfg.base,model.d+margin,model.x,cfg.base/2,model.z,'stone',model.yaw||0);const turn=!!model.yaw;platforms.push(rectPlatform(model.x,model.z,(turn?model.d:model.w)+margin,(turn?model.w:model.d)+margin,cfg.base));}
    if(cfg.gate){colliders.push(rectCollider(model.x-model.w*.32,model.z,model.w*.36,model.d));colliders.push(rectCollider(model.x+model.w*.32,model.z,model.w*.36,model.d));}
    else colliders.push(rectCollider(model.x,model.z,model.yaw?model.d*.86:model.w*.88,model.yaw?model.w*.88:model.d*.86));}
   models.push(model);picks.push(pick(model));continue;
 }
 const parts=rectangles(b);
 for(const r of parts){if(r.w<.4||r.d<.4)continue;const narrow=Math.min(r.w,r.d);if(narrow<2.3){batch.box(r.w,3.2,r.d,r.x,1.6,r.z,'wall');continue;}
   const turn=r.d>r.w*1.3,w=turn?r.d:r.w,d=turn?r.w:r.d;
   const h=Math.min(10,Math.max(4.5,d*.55));const dark=b.name==='文渊阁'||b.name.includes('雨花')||b.tags['roof:colour']==='green';
   const model={x:r.x,z:r.z,w:Math.max(1,w-2),d:Math.max(1,d-2),h,base:.5,yaw:turn?Math.PI/2:0};
   // Most unmapped forms remain explicitly schematic, while footprint positions are retained.
   if(dark){const temp=new Batch({...mats,tile:mats.darkTile});hall(temp,model,'gable',b.name==='文渊阁');const g=temp.finish();scene.add(g);}else hall(batch,model,b.tags['roof:shape']==='hipped'?'hip':b.name.endsWith('亭')?'pyramid':'gable',false);
 }
 colliders.push({points:b.points,holes:b.holes,height:8,kind:'closed'});
 }
 const groups=[];for(const batch of chunks.values()){const g=batch.finish();scene.add(g);groups.push(g);}
 // Corner towers: institutional central pavilion 8.73 m, asymmetric annexes 1.60 / 3.98 m.
 const towerBatch=new Batch(mats);
 for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*367,z=sz*471;const c={x,z,w:8.73,d:8.73,h:17,base:10};hall(towerBatch,c,'gablehip',true);roof(towerBatch,{...c,w:12.5,d:12.5,h:9,base:10},'hip',false);for(const axis of [0,1])for(const s of [-1,1]){const inner=axis===0?s===-sx:s===-sz,depth=inner?3.98:1.6;hall(towerBatch,{x:x+(axis===0?s*(4.365+depth/2):0),z:z+(axis===1?s*(4.365+depth/2):0),w:axis===0?depth:4.5,d:axis===0?4.5:depth,h:9,base:10},'gablehip',false);}
 const model={...c,id:`corner-${sx}-${sz}`,name:`${sz<0?'北':'南'}${sx<0?'西':'东'}角楼`,sourceId:'236522',status:'中央8.73米核对；复合屋顶轮廓估算',description:'十字形平面、三重檐复合屋顶。中央方亭8.73米与内外抱厦深度采用官方值，构件和七十二脊未逐条复原。'};models.push(model);picks.push(pick(model));}
 const towers=towerBatch.finish();scene.add(towers);groups.push(towers);
 return {groups,colliders,platforms,models,picks};
}
function hall(batch,b,type,double,gate=false){
 const body=b.h*(double?.39:.55),yaw=b.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),base=b.base||0;
 const box=(w,h,d,x,y,z,mat)=>batch.box(w,h,d,b.x+x*c+z*s,y,b.z-x*s+z*c,mat,yaw);
 if(gate){box(b.w*.28,body,b.d,-b.w*.36,base+body/2,0,'red');box(b.w*.28,body,b.d,b.w*.36,base+body/2,0,'red');box(b.w*.44,body*.22,b.d,0,base+body*.89,0,'red');}
 else{
  const bays=b.bays||Math.max(3,Math.min(15,Math.round(b.w/4))),bw=b.w*.88/bays;
  // Closed shell remains solid for collision, with recessed dark fenestration.
  box(b.w*.88,body,b.d*.86,0,base+body/2,0,b.id?'window':'wall');
  for(const side of [-1,1]){
   box(b.w*.89,body*.17,.19,0,base+body*.085,side*b.d*.434,'brick');
   for(let i=0;i<bays;i++){
    const xx=-b.w*.44+(i+.5)*bw,door=i===Math.floor(bays/2),z=side*b.d*.439;
    box(bw*.84,body*.59,.1,xx,base+body*.5,z,'window');
    box(bw*.84,body*.21,.11,xx,base+body*.22,z+side*.03,'red');
    for(let leaf=0;leaf<=4;leaf++)box(.075,body*.76,.13,xx-bw*.42+leaf*bw*.21,base+body*.46,z+side*.065,'red');
    for(const level of [.14,.32,.80])box(bw*.88,.11,.15,xx,base+body*level,z+side*.065,'paint');
    if(door)box(bw*.85,.12,.45,xx,base+.07,z,'stone');
   }
   box(b.w*.92,.45,.32,0,base+body-.5,side*b.d*.45,'blue');
   if(b.id)for(let i=0;i<=bays;i++){
    const xx=-b.w*.48+i*b.w*.96/bays,zz=side*b.d*.48;
    batch.add(new THREE.CylinderGeometry(.23,.26,body,10),'red',b.x+xx*c+zz*s,base+body/2,b.z-xx*s+zz*c);
   }
  }
  for(const side of [-1,1])box(.15,body*.16,b.d*.87,side*b.w*.443,base+body*.08,0,'brick');
 }
 roof(batch,b,type,double);box(b.w,.48,b.d,0,base+body-.24,0,'blue');
}
function gatePlatform(batch,x,z,w,d,h,colliders,rotate=false){const gap=Math.min(22,w*.4),ww=(w-gap)/2;const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();const n=w>60?3:1,opening=n===3?5.5:gap*.75;for(let i=0;i<n;i++){const cx=(i-(n-1)/2)*7.1,r=opening/2,hole=new THREE.Path();hole.moveTo(cx-r,0);hole.lineTo(cx-r,h*.5);hole.absarc(cx,h*.5,r,Math.PI,0,true);hole.lineTo(cx+r,0);hole.closePath();shape.holes.push(hole);}
 const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1});g.translate(0,0,-d/2);batch.add(g,'wall',rotate?z:x,0,rotate?x:z,rotate?Math.PI/2:0);
 for(const s of [-1,1]){const cx=x+s*(ww/2+gap/2);colliders.push(rotate?rectCollider(z,cx,d,ww):rectCollider(cx,z,ww,d));}
 if(n===3)for(const s of [-1,1])colliders.push(rotate?rectCollider(z,x+s*3.55,d,1.6):rectCollider(x+s*3.55,z,1.6,d));
}
function rectCollider(x,z,w,d){return {points:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],holes:[],height:20,kind:'closed'};}
function rectPlatform(x,z,w,d,height){return {...rectCollider(x,z,w,d),height};}
function pick(m){const mesh=new THREE.Mesh(new THREE.BoxGeometry(m.w||20,(m.h||20)+(m.base||0),m.d||20),new THREE.MeshBasicMaterial({visible:false}));mesh.position.set(m.x,((m.h||20)+(m.base||0))/2,m.z);mesh.rotation.y=m.yaw||0;mesh.userData.model=m;return mesh;}
