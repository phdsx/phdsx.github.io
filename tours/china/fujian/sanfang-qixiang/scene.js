import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createMaterials,metreUV,loadPbrMaterials} from './materials.js';
import {footprintFrame,nearestRoad,toLocal,segmentDistance} from './geo.js';

class Batch {
 constructor(materials){this.materials=materials;this.parts=new Map();}
 add(geometry,key,transform){if(transform)geometry.applyMatrix4(transform);if(geometry.index){const plain=geometry.toNonIndexed();geometry.dispose();geometry=plain;}geometry.computeVertexNormals();metreUV(geometry,key==='brick'?1.6:key==='tile'?1.5:key==='stone'?2:key==='wood'?.4:1);geometry.deleteAttribute('color');if(!this.parts.has(key))this.parts.set(key,[]);this.parts.get(key).push(geometry);}
 box(x,y,z,w,h,d,key,angle=0){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(w,h,d));this.add(new THREE.BoxGeometry(1,1,1),key,matrix);}
 finish(name){const group=new THREE.Group();group.name=name;for(const [key,parts] of this.parts){const geometry=mergeGeometries(parts,false);if(!geometry)throw Error('几何合并失败：'+name+'/'+key);const mesh=new THREE.Mesh(geometry,this.materials[key]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.materialKey=key;group.add(mesh);parts.forEach(g=>g.dispose());}this.parts.clear();return group;}
}
function shape(points){return new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],-p[1])));}
function prism(points,height){const g=new THREE.ExtrudeGeometry(shape(points),{depth:height,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);return g;}
function clip(poly,mid,positive){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=positive?a[1]>=mid:a[1]<=mid,ib=positive?b[1]>=mid:b[1]<=mid;if(ia)out.push(a);if(ia!==ib){const t=(mid-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,mid]);}}return out;}
function roof(batch,b,height,key='tile'){
 const f=footprintFrame(b.footprint),mid=(f.minZ+f.maxZ)/2,half=(f.maxZ-f.minZ)/2,rise=Math.min(2.2,Math.max(.55,half*.26));
 const topHeight=z=>height+.12+rise*(1-Math.abs(z-mid)/(half||1));
 for(const positive of [false,true]){const p=clip(f.local,mid,positive);if(p.length<3)continue;const g=new THREE.ShapeGeometry(shape(p));const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=-a.getY(i),p=f.world(x,z);a.setXYZ(i,p[0],topHeight(z),p[1]);}g.computeVertexNormals();batch.add(g,key);}
 // Thickness at the eave and solid gable ends; no floating roof planes.
 for(let i=0;i<f.local.length;i++){const a=f.local[i],b=f.local[(i+1)%f.local.length],p=f.world(...a),q=f.world(...b),ha=topHeight(a[1]),hb=topHeight(b[1]);const coords=[p[0],height,p[1],q[0],height,q[1],q[0],hb,q[1],p[0],height,p[1],q[0],hb,q[1],p[0],ha,p[1]];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));batch.add(geo,'wall');}
 const p=f.world(f.minX,mid),q=f.world(f.maxX,mid),w=Math.hypot(q[0]-p[0],q[1]-p[1]);batch.box((p[0]+q[0])/2,height+rise+.16,(p[1]+q[1])/2,w,.2,.22,'ridge',f.angle);
 return {frame:f,rise};
}
function beam(batch,a,b,width,height,y,key){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)return;batch.box((a[0]+b[0])/2,y,(a[1]+b[1])/2,len,height,width,key,Math.atan2(-dz,dx));}
function roadGeometry(road){
 const p=road.points,positions=[],uvs=[],indices=[];
 let distance=0;
 for(let i=0;i<p.length;i++){
  if(i)distance+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);
  let before=i?p[i-1]:p[i],after=i<p.length-1?p[i+1]:p[i];
  const dx=after[0]-before[0],dz=after[1]-before[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  // Width is explicit estimated input, not a surveyed road boundary.
  for(const sign of [-1,1]){positions.push(p[i][0]+nx*road.width*.5*sign,.035,p[i][1]+nz*road.width*.5*sign);uvs.push(road.width*(sign+1)/4,distance/2);}
  if(i){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function localBuilder(batch,origin,angle){const c=Math.cos(angle),s=Math.sin(angle);return (x,y,z,w,h,d,key)=>batch.box(origin[0]+c*x+s*z,y,origin[1]-s*x+c*z,w,h,d,key,angle);}
function roundedArch(batch,origin,angle,center,width,bottom,spring,key,depth=.18){
 const pts=[[center-width/2,bottom],[center+width/2,bottom],[center+width/2,spring]];
 for(let i=1;i<=16;i++){const a=i*Math.PI/16;pts.push([center+Math.cos(a)*width/2,spring+Math.sin(a)*width/2]);}pts.push([center-width/2,bottom]);
 const g=new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p=>new THREE.Vector2(...p))),{depth,bevelEnabled:false});g.applyMatrix4(new THREE.Matrix4().makeRotationY(angle));g.translate(origin[0],0,origin[1]);batch.add(g,key);
}
function gable(batch,a,b,height){
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]),origin=[(a[0]+b[0])/2,(a[1]+b[1])/2],box=localBuilder(batch,origin,angle);
 const width=Math.min(9,len),base=height-.65,points=[];
 // Fujian saddle profile traced typologically from 2023 tree photograph.
 // Shape/scale are approximate, never attributed to a surveyed elevation.
 for(let i=0;i<=24;i++){const x=-width/2+width*i/24,t=Math.abs(x)/(width/2),y=base+1.35*Math.pow(t,2.8);points.push([x,y]);}
 const boundary=[[-width/2,base-.55],[width/2,base-.55],...points.slice().reverse()];
 const g=new THREE.ExtrudeGeometry(new THREE.Shape(boundary.map(p=>new THREE.Vector2(...p))),{depth:.26,bevelEnabled:false});g.applyMatrix4(new THREE.Matrix4().makeRotationY(angle));g.translate(origin[0],0,origin[1]);batch.add(g,'wall');
 for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i],x=(p[0]+q[0])/2,y=(p[1]+q[1])/2,l=Math.hypot(q[0]-p[0],q[1]-p[1]);const geom=new THREE.BoxGeometry(l,.11,.36);geom.rotateZ(Math.atan2(q[1]-p[1],q[0]-p[0]));geom.translate(x,y+.08,.12);geom.rotateY(angle);geom.translate(origin[0],0,origin[1]);batch.add(geom,'tile');}
 box(-width/2,base+.78,.13,.28,.4,.36,'tile');box(width/2,base+.78,.13,.28,.4,.36,'tile');
}
const profiles={
 '985162844':{height:6.4,kind:'timber',note:'南后街西侧连续木构立面；按照片类型近似'},
 '985162854':{height:7.7,kind:'ye',note:'叶氏民居照片立面候选映射，门牌与建筑轮廓对应待核准'},
 '985168381':{height:5.3,kind:'saddle',note:'白墙与马鞍墙类型近似，具体分段位置待核准'},
 '985173406':{height:6.2,kind:'timber',note:'木构门窗类型近似'},
 '985173407':{height:5.3,kind:'saddle',note:'爱心树照片东侧白墙类型近似'},
 '985181993':{height:6.2,kind:'timber',note:'爱心树照片西侧木构类型近似'},
 '985181997':{height:6.2,kind:'timber',note:'爱心树照片西侧木构类型近似'},
 '985181996':{height:6.2,kind:'timber',note:'爱心树照片西侧木构类型近似'}
};
function facade(batch,b,road,kind,height,detail){
 let bestYe=-1,bestScore=-1;if(kind==='ye')for(let i=0;i<b.footprint.length;i++){const a=b.footprint[i],q=b.footprint[(i+1)%b.footprint.length],p=[(a[0]+q[0])/2,(a[1]+q[1])/2],distance=nearestRoad(p,[road]).distance,score=Math.hypot(q[0]-a[0],q[1]-a[1])/(distance+1);if(score>bestScore){bestScore=score;bestYe=i;}}
 for(let i=0;i<b.footprint.length;i++){
  if(kind==='ye'&&i!==bestYe)continue;
  let a=b.footprint[i],q=b.footprint[(i+1)%b.footprint.length];const mid=[(a[0]+q[0])/2,(a[1]+q[1])/2],length=Math.hypot(q[0]-a[0],q[1]-a[1]);
  if(nearestRoad(mid,[road]).distance>14||length<3)continue;
  let angle=Math.atan2(-(q[1]-a[1]),q[0]-a[0]);const normal=[Math.sin(angle),Math.cos(angle)];
  if(normal[0]*(mid[0]-b.center[0])+normal[1]*(mid[1]-b.center[1])<0){[a,q]=[q,a];angle+=Math.PI;}
  const origin=[mid[0]+Math.sin(angle)*.08,mid[1]+Math.cos(angle)*.08],box=localBuilder(batch,origin,angle),bayCount=Math.max(1,Math.round(length/(kind==='ye'?2.75:3.8))),bay=length/bayCount;
  box(0,.2,.1,length,.4,.2,'sill');box(0,height-.35,.28,length,.2,.62,'dark');box(0,3.18,.14,length,.18,.26,'wood');
  if(kind==='ye'){
    // Five upper openings are supported by the reference photograph. The
    // façade is modelled geometrically with modest tinted glazing and frames.
    const n=5,w=length/n;
    for(let j=0;j<n;j++){const x=-length/2+w*(j+.5),archOrigin=[origin[0]+Math.sin(angle)*.1,origin[1]+Math.cos(angle)*.1];roundedArch(batch,archOrigin,angle,x,w*.76,4.28,6.35,'sill',.18);roundedArch(batch,[archOrigin[0]+Math.sin(angle)*.035,archOrigin[1]+Math.cos(angle)*.035],angle,x,w*.62,4.4,6.35,'glass',.18);
      for(let k=0;k<3;k++)box(x+w*.62/3*(k-1),5.3,.34,w*.62/3-.07,1.53,.025,k===1?'rose':'aqua');
      for(const y of [4.82,5.7]){const diamond=new THREE.BoxGeometry(w*.22,w*.22,.028);diamond.rotateZ(Math.PI/4);diamond.translate(x,y,.364);diamond.rotateY(angle);diamond.translate(origin[0],0,origin[1]);batch.add(diamond,'amber');}
      box(x,5.5,.39,.06,2.2,.06,'wood');box(x,6.12,.39,w*.62,.055,.06,'wood');box(x,4.42,.39,w*.69,.1,.24,'sill');
      for(let k=0;k<12;k++){const t=Math.PI*k/11,px=x+Math.cos(t)*w*.37,py=6.35+Math.sin(t)*w*.37;box(px,py,.29,.105,.18,.18,'stone');}
    }
    // Portal is a recessed façade, not an invented navigable courtyard.
    for(const x of [-length*.34,0,length*.34]){roundedArch(batch,[origin[0]+Math.sin(angle)*.12,origin[1]+Math.cos(angle)*.12],angle,x,2.2,.25,2.05,'dark',.23);box(x,.12,.58,2.5,.24,.88,'sill');for(let k=0;k<12;k++){const t=Math.PI*k/11;box(x+Math.cos(t)*1.18,2.05+Math.sin(t)*1.18,.39,.19,.23,.24,'brick');}}
    box(0,3.8,.75,3.3,.18,1.5,'sill');box(0,4.38,1.4,3.3,.075,.065,'iron');for(let j=0;j<15;j++)box(-1.56+j*.223,4.1,1.4,.035,.55,.035,'iron');box(-1.65,4.1,.72,.035,.6,1.4,'iron');box(1.65,4.1,.72,.035,.6,1.4,'iron');
    box(0,height-.22,.13,length,.18,.35,'brick');
    continue;
  }
  for(let j=0;j<bayCount;j++){
    const x=-length/2+(j+.5)*bay,w=Math.min(2.5,bay-.45);
    // Real thickness: doors sit behind projecting jambs and a threshold.
    box(x,1.52,.115,w,2.56,.12,'dark');box(x-w/2-.065,1.53,.2,.13,2.74,.22,'wood');box(x+w/2+.065,1.53,.2,.13,2.74,.22,'wood');box(x,2.87,.2,w+.28,.15,.28,'wood');box(x,.27,.4,w+.28,.18,.62,'sill');
    const panels=4;for(let k=0;k<panels;k++){const px=x-w/2+w/panels*(k+.5);box(px,1.47,.215,w/panels-.05,2.37,.09,'wood');box(px,1.8,.27,w/panels-.1,.045,.06,'dark');box(px,.6,.27,w/panels-.1,.05,.06,'dark');}
    if(kind==='timber'&&height>5.8){box(x,4.77,.16,w,2.16,.12,'dark');for(let k=0;k<5;k++)box(x-w/2+k*w/4,4.77,.3,.075,2.26,.12,'wood');for(const y of [3.64,4.3,5.2,5.88])box(x,y,.3,w+.12,.085,.13,'wood');for(let k=0;k<8;k++){const px=x-w/2+w/8*(k+.5);box(px,4.75,.25,w/8-.03,.77,.06,'wood');}box(x,3.8,.58,w+.35,.07,.06,'wood');for(let k=0;k<10;k++)box(x-w/2+w/9*k,3.49,.58,.045,.58,.045,'wood');}
    else{box(x,3.98,.13,w*.65,.88,.14,'dark');for(let k=0;k<5;k++)box(x-w*.325+k*w*.65/4,3.98,.24,.055,.96,.09,'wood');box(x,3.52,.25,w*.7,.1,.2,'sill');}
  }
  // Eave rafters use instancing at the fine LOD; origin follows the real wall.
  for(let x=-length/2+.15;x<length/2;x+=.45)box(x,height-.25,.4,.11,.16,.85,'wood');
  if(kind==='saddle')gable(batch,a,q,height+.5);
  // Restrained low plinth and position-dependent damp staining, not weather
  // pasted uniformly over every façade. This remains procedural approximation.
  box(0,.5,.145,length,.13,.02,'moss');
 }
}
function addTilesInstanced(scene,b,roofInfo,height,mat){
 const f=roofInfo.frame,half=f.depth/2,mid=(f.minZ+f.maxZ)/2,rise=roofInfo.rise;
 const pitch=Math.atan2(rise,half),countX=Math.floor(f.width/.27),countZ=Math.floor(half/.38);
 if(countX*countZ>11000||countX<1||countZ<1)return;
 const geometry=new THREE.CylinderGeometry(.072,.084,.38,7,1,true,0,Math.PI);geometry.rotateX(Math.PI/2);
 const instance=new THREE.InstancedMesh(geometry,mat,countX*countZ*2),object=new THREE.Object3D();let n=0;
 for(const sign of [-1,1])for(let row=0;row<countZ;row++)for(let col=0;col<countX;col++){
   const x=f.minX+.15+col*.27,z=mid+sign*(.21+row*.38),world=f.world(x,z);
   // Skip tiles outside concave footprints, never fill the bounding rectangle.
   let inside=false;for(let i=0,j=b.footprint.length-1;i<b.footprint.length;j=i++){const a=b.footprint[i],q=b.footprint[j];if((a[1]>world[1])!==(q[1]>world[1])&&world[0]<(q[0]-a[0])*(world[1]-a[1])/(q[1]-a[1])+a[0])inside=!inside;}if(!inside)continue;
   object.position.set(world[0],height+.16+rise*(1-Math.abs(z-mid)/half),world[1]);object.rotation.set(sign*pitch,f.angle,0,'YXZ');object.updateMatrix();instance.setMatrixAt(n++,object.matrix);
 }instance.count=n;instance.castShadow=false;instance.receiveShadow=true;instance.name='瓦片实例 · '+b.id;instance.computeBoundingSphere();scene.add(instance);
}
function treeAt(scene,x,z,bark){
 const group=new THREE.Group();group.position.set(x,0,z);group.name='爱心树 · 位置及形态近似';
 const trunkGeometry=new THREE.CylinderGeometry(.23,.46,6.4,13,14),position=trunkGeometry.attributes.position;for(let i=0;i<position.count;i++){const y=position.getY(i);position.setX(i,position.getX(i)+.055*Math.sin(y*1.7)+y*.055);}trunkGeometry.computeVertexNormals();
 metreUV(trunkGeometry,1.4);const trunk=new THREE.Mesh(trunkGeometry,bark);trunk.position.y=3.2;trunk.castShadow=true;group.add(trunk);
 const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=256;const lc=leafCanvas.getContext('2d');
 for(let i=0;i<45;i++){const px=128+Math.sin(i*2.399)*Math.sqrt(i/45)*114,py=128+Math.cos(i*2.399)*Math.sqrt(i/45)*112;lc.save();lc.translate(px,py);lc.rotate(i*2.17);lc.fillStyle=i%3===0?'#71845e':i%3===1?'#82936c':'#536845';lc.beginPath();lc.ellipse(0,0,7,14,0,0,Math.PI*2);lc.fill();lc.strokeStyle='#99a181';lc.lineWidth=.7;lc.beginPath();lc.moveTo(0,-12);lc.lineTo(0,12);lc.stroke();lc.restore();}
 const leafMap=new THREE.CanvasTexture(leafCanvas);leafMap.colorSpace=THREE.SRGBColorSpace;leafMap.anisotropy=4;
 const leafGeometry=new THREE.PlaneGeometry(1.35,1.35),mat=new THREE.MeshStandardMaterial({map:leafMap,color:0xc6cfc0,alphaTest:.5,side:THREE.DoubleSide,roughness:1});
 const leaves=new THREE.InstancedMesh(leafGeometry,mat,3200),dummy=new THREE.Object3D(),color=new THREE.Color();
 // A pair of upper lobes and tapered lower canopy approximate the photographed
 // heart silhouette. Deterministic botanical variation only; no invented trees.
 for(let i=0;i<3200;i++){const j=Math.floor(i/2),a=j*2.3999632297,side=i%2?1:-1,u=1-2*(j+.5)/1600,r=Math.sqrt(1-u*u),theta=i*1.247,px=Math.cos(a)*r*3.8+side*1.45,pz=Math.sin(a)*r*3.7,py=9.7+u*3.3+(side===1?.08:0);dummy.position.set(px,py,pz);dummy.scale.setScalar(.85+.25*Math.sin(theta));dummy.rotation.set(i*.731,i*1.337,i*.379);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);color.setHSL(.23,.13,.56+.08*Math.sin(i*2.7));leaves.setColorAt(i,color);}
 leaves.castShadow=true;leaves.receiveShadow=true;group.add(leaves);
 for(let i=0;i<9;i++){const start=new THREE.Vector3(.12,4.7,.05),end=new THREE.Vector3(Math.sin(i*2.3)*2.5,8.4,Math.cos(i*2.3)*2.3),direction=end.clone().sub(start),branch=new THREE.Mesh(metreUV(new THREE.CylinderGeometry(.04,.16,direction.length(),9),1.4),bark);branch.position.copy(start).add(end).multiplyScalar(.5);branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());branch.castShadow=true;group.add(branch);}
 const bed=new THREE.Mesh(new THREE.CylinderGeometry(.9,1,.18,24),new THREE.MeshStandardMaterial({color:0x777b6a,roughness:1}));bed.position.y=.09;group.add(bed);scene.add(group);return {group,collision:{id:'heart-tree',polygon:[[x-.48,z-.48],[x+.48,z-.48],[x+.48,z+.48],[x-.48,z+.48]]}};
}
function gateAt(materials){
 const batch=new Batch(materials),center=toLocal(119.29151,26.08839),angle=-.1,box=localBuilder(batch,center,angle);
 // North entrance: four straight stone columns and three lintels, as seen
 // in the 2023 reference. There is deliberately no generic palace roof.
 for(const x of [-5.6,-3.1,3.1,5.6]){const tall=Math.abs(x)<4,h=tall?7.2:6.05;box(x,.16,0,1.15,.32,1.15,'granite');box(x,h/2+.2,0,.56,h,.65,'granite');box(x,.9,0,.72,1.45,.8,'granite');box(x,h+.36,0,.59,.72,.69,'granite');}
 box(0,5.95,0,5.65,1.55,.48,'granite');box(-4.35,5.2,0,2.55,1.35,.48,'granite');box(4.35,5.2,0,2.55,1.35,.48,'granite');for(const x of [-4.35,0,4.35]){const w=x===0?5.8:2.7,y=x===0?6.78:5.94;box(x,y,0,w,.18,.65,'granite');box(x,y-1.48,0,w,.16,.6,'granite');}
 const group=batch.finish('南后街北口牌坊 · 照片近似');
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.fillStyle='#9b8d53';ctx.font='150px SimSun,serif';ctx.textAlign='center';ctx.fillText('街  後  南',512,184);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.1),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false}));sign.position.set(center[0]-.026,5.92,center[1]-.258);sign.rotation.y=angle+Math.PI;group.add(sign);
 const extras=[];for(const x of [-5.6,-3.1,3.1,5.6]){const px=center[0]+Math.cos(angle)*x,pz=center[1]-Math.sin(angle)*x;extras.push({id:'gate-pillar',polygon:[[px-.6,pz-.6],[px+.6,pz-.6],[px+.6,pz+.6],[px-.6,pz+.6]]});}
 return {group,extras,center};
}
function lantern(group,materials,point,radius){const geometry=new THREE.SphereGeometry(radius,24,16),mesh=new THREE.Mesh(geometry,materials.lantern);mesh.scale.y=.72;mesh.position.set(...point);mesh.castShadow=true;group.add(mesh);for(const y of [-.64,.64]){const collar=new THREE.Mesh(new THREE.CylinderGeometry(radius*.25,radius*.25,.055,12),materials.gold);collar.position.set(point[0],point[1]+y*radius,point[2]);group.add(collar);}const tassel=new THREE.Mesh(new THREE.CylinderGeometry(.025,.015,radius*.7,8),materials.lantern);tassel.position.set(point[0],point[1]-radius*1.08,point[2]);group.add(tassel);}
async function gatePhotoDetails(gate,materials,warn){
 const loader=new THREE.TextureLoader(),center=gate.center,angle=-.1;
 for(const config of [{file:'gate-relief.jpg',x:0,y:5.46,w:5.56,h:.53},{file:'gate-inscription-left.jpg',x:-3.1,y:3.53,w:.25,h:3.85},{file:'gate-inscription-right.jpg',x:3.1,y:3.53,w:.25,h:3.85}]){
  try{const map=await loader.loadAsync('./textures/'+config.file);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;const material=new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.97});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(config.w,config.h),material);mesh.rotation.y=angle+Math.PI;mesh.position.set(center[0]+Math.cos(angle)*config.x+Math.sin(angle)*(-.248),config.y,center[1]-Math.sin(angle)*config.x+Math.cos(angle)*(-.248));mesh.receiveShadow=true;gate.group.add(mesh);}catch(error){warn('牌坊照片细节加载失败：textures/'+config.file+'；保留几何模型。');}
 }
 // Exactly the four lanterns visible in the north-entrance reference. Their
 // dimensions and hanging positions remain explicit photo approximations.
 for(const x of [-4.35,-1.6,1.6,4.35])lantern(gate.group,materials,[center[0]+Math.cos(angle)*x,Math.abs(x)>4?4.23:4.8,center[1]-Math.sin(angle)*x],Math.abs(x)>4?.33:.4);
}
export async function buildScene(scene,data,onProgress){
 const warnings=[],materials=createMaterials();await loadPbrMaterials(materials,message=>warnings.push(message));const roads=new THREE.Group();roads.name='OSM 街巷';scene.add(roads);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),materials.base);ground.rotation.x=-Math.PI/2;ground.position.set(-50,-.035,80);ground.receiveShadow=true;scene.add(ground);
 for(const [i,road] of data.roads.entries()){const material=(road.type==='primary'||road.type==='secondary'||road.type==='tertiary'?materials.sill:materials.stone).clone();material.side=THREE.DoubleSide;material.polygonOffset=true;material.polygonOffsetFactor=-1-i*.1;material.polygonOffsetUnits=-1-i*.1;const mesh=new THREE.Mesh(roadGeometry(road),material);mesh.position.y=i*.0004;mesh.receiveShadow=true;mesh.userData.road=road;mesh.userData.originalMaterial=material;mesh.renderOrder=i;roads.add(mesh);}
 const main=data.roads.find(r=>r.name==='南后街'),chunks=new Map(),sampleDetails=[];let index=0;
 for(const b of data.buildings){const key=Math.floor(b.center[0]/120)+','+Math.floor(b.center[1]/120);if(!chunks.has(key))chunks.set(key,{batch:new Batch(materials),center:[Math.floor(b.center[0]/120)*120+60,Math.floor(b.center[1]/120)*120+60]});const chunk=chunks.get(key),profile=profiles[b.id],height=profile?.height||b.height;
  chunk.batch.add(prism(b.footprint,height),b.sample?(profile?.kind==='ye'?'brick':'wall'):'wall');
  const roofInfo=roof(chunk.batch,b,height);
  if(b.sample){const batch=new Batch(materials);facade(batch,b,main,profile?.kind||'saddle',height);const detail=batch.finish('照片类型近似 · '+b.id);scene.add(detail);sampleDetails.push({group:detail,center:b.center,id:b.id,kind:profile?.kind||'saddle',note:profile?.note||'立面类型近似，缺少该栋单独照片'});if(b.area>65&&b.area<1000){const tiles=new THREE.Group();addTilesInstanced(tiles,b,roofInfo,height,materials.tile);scene.add(tiles);sampleDetails.push({group:tiles,center:b.center,id:b.id,tiles:true});}}
  index++;if(index%60===0){onProgress(25+index/data.buildings.length*60,'建立独立建筑轮廓 '+index+' / '+data.buildings.length);await new Promise(r=>setTimeout(r,0));}
 }
 const groups=[];for(const [key,chunk] of chunks){const group=chunk.batch.finish('街区 '+key);scene.add(group);groups.push({group,center:chunk.center});}
 // Drain strips only along the demonstration street, below walking surface.
 const drainBatch=new Batch(materials);for(let i=1;i<main.points.length;i++){const a=main.points[i-1],b=main.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;for(const sign of [-1,1]){const offset=main.width*.5-.45;beam(drainBatch,[a[0]+nx*offset*sign,a[1]+nz*offset*sign],[b[0]+nx*offset*sign,b[1]+nz*offset*sign],.2,.024,.052,'dark');}}
 const drains=drainBatch.finish('排水带 · 形式近似');scene.add(drains);
 const tree=treeAt(scene,16.1,109,materials.bark),gate=gateAt(materials);scene.add(gate.group);
 await gatePhotoDetails(gate,materials,message=>warnings.push(message));
 onProgress(95,'准备光照与浏览控制…');
 return {materials,roads,chunks:groups,details:sampleDetails,tree,gate,extras:[tree.collision,...gate.extras],profiles,warnings,
  setEvidence(enabled){for(const chunk of groups)for(const mesh of chunk.group.children)mesh.material=enabled?materials.missing:materials[mesh.userData.materialKey];for(const detail of sampleDetails)detail.group.traverse(mesh=>{if(mesh.isMesh){if(!mesh.userData.originalMaterial)mesh.userData.originalMaterial=mesh.material;mesh.material=enabled?materials.approx:mesh.userData.originalMaterial;}});for(const mesh of roads.children)mesh.material=enabled?materials.roadData:mesh.userData.originalMaterial;},
  update(camera,mode,quality){for(const chunk of groups){const d=Math.hypot(camera.position.x-chunk.center[0],camera.position.z-chunk.center[1]);chunk.group.visible=mode==='aerial'||d<350;}for(const d of sampleDetails){const distance=Math.hypot(camera.position.x-d.center[0],camera.position.z-d.center[1]);d.group.visible=mode==='walk'&&distance<(d.tiles?(quality==='high'?75:quality==='medium'?42:0):130);}}
 };
}
