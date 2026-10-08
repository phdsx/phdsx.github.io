import * as THREE from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {Sky} from '../vendor/Sky.js';
import {inPolygon,polygons,lines,seeded,bounds} from './geo.js';

function noiseTexture(kind,seed=251){
 const rnd=seeded(seed),c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 const base=kind==='grass'?[119,128,88]:kind==='stone'?[177,173,158]:kind==='bark'?[106,98,80]:[137,138,133];
 const im=ctx.createImageData(512,512);for(let i=0;i<im.data.length;i+=4){const n=(rnd()-.5)*(kind==='grass'?34:27);for(let j=0;j<3;j++)im.data[i+j]=base[j]+n;im.data[i+3]=255;}ctx.putImageData(im,0,0);
 if(kind==='stone'){ctx.strokeStyle='#7c7b702f';ctx.lineWidth=1.5;for(let y=0;y<512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();for(let x=(y%256)/2;x<512;x+=256){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+128);ctx.stroke();}}}
 if(kind==='bark'){for(let i=0;i<140;i++){ctx.strokeStyle=`rgba(40,34,25,${rnd()*.25})`;ctx.beginPath();let x=rnd()*512;ctx.moveTo(x,0);ctx.bezierCurveTo(x+20,150,x-20,300,x+3,512);ctx.stroke();}}
 const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function surfaceMaterial(color,map,roughness=1){return new THREE.MeshStandardMaterial({color,map,roughness,metalness:0});}
function shapeOf(poly){const s=new THREE.Shape(poly[0].map(([x,z])=>new THREE.Vector2(x,-z)));for(const ring of poly.slice(1))s.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));return s;}
function flatGeometry(poly,height){const g=new THREE.ShapeGeometry(shapeOf(poly));g.rotateX(-Math.PI/2);const pos=g.attributes.position;const uv=g.attributes.uv;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,typeof height==='function'?height(x,z):height);uv.setXY(i,x/2,z/2);}g.computeVertexNormals();return g;}
function mesh(scene,g,m,cast=true){const o=new THREE.Mesh(g,m);o.castShadow=cast;o.receiveShadow=true;scene.add(o);return o;}
function beam(a,b,width,material){const d=new THREE.Vector3().subVectors(b,a),g=new THREE.CylinderGeometry(width,width,d.length(),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());return g;}
function roofSurface(poly,fn){
 const base=flatGeometry(poly,0).toNonIndexed(),pos=base.attributes.position,verts=[];
 function sub(a,b,c,d){if(d===0){for(const q of [a,b,c])verts.push(q[0],fn(q[0],q[1]),q[1]);return;}const ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca=[(c[0]+a[0])/2,(c[1]+a[1])/2];sub(a,ab,ca,d-1);sub(ab,b,bc,d-1);sub(ca,bc,c,d-1);sub(ab,bc,ca,d-1);}
 for(let i=0;i<pos.count;i+=3)sub([pos.getX(i),pos.getZ(i)],[pos.getX(i+1),pos.getZ(i+1)],[pos.getX(i+2),pos.getZ(i+2)],3);
 base.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();return g;
}
function buildGreenhouse(scene,poly,f,mats){
 const [x0,z0,x1,z1]=bounds(poly[0]),cx=(x0+x1)/2,cz=(z0+z1)/2;
 // Only the footprint is sourced. The continuous inclined roof is a replaceable approximation.
 const roof=(x,z)=>f.base+10+12*Math.sqrt(Math.max(0,1-((x-cx)/(x1-x0)*1.65)**2))+7*(1-(z-z0)/(z1-z0));
 // Exterior-only tinted glazing proxy: opaque reflection avoids stacked transparent
 // surfaces and does not imply that the unmeasured interior has been reconstructed.
 const glass=new THREE.MeshPhysicalMaterial({color:0x718780,roughness:.20,metalness:.06,clearcoat:.7,clearcoatRoughness:.16,side:THREE.DoubleSide,envMapIntensity:.8});
 mesh(scene,roofSurface(poly,roof),glass);
 const wallPos=[],ribs=[];
 const ring=poly[0];for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],ah=roof(...a),bh=roof(...b),y=f.base+.2;
  wallPos.push(a[0],y,a[1],b[0],y,b[1],b[0],bh,b[1],a[0],y,a[1],b[0],bh,b[1],a[0],ah,a[1]);
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3);
  for(let j=0;j<n;j++){const u=j/n,x=a[0]*(1-u)+b[0]*u,z=a[1]*(1-u)+b[1]*u;ribs.push(beam(new THREE.Vector3(x,y,z),new THREE.Vector3(x,roof(x,z),z),.075));}
  ribs.push(beam(new THREE.Vector3(a[0],ah,a[1]),new THREE.Vector3(b[0],bh,b[1]),.15));
  // Horizontal mullions in metres, explicitly estimated.
  for(let hh=y+3;hh<Math.min(ah,bh);hh+=3)ribs.push(beam(new THREE.Vector3(a[0],hh,a[1]),new THREE.Vector3(b[0],hh,b[1]),.055));
 }
 const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wallPos,3));wg.computeVertexNormals();mesh(scene,wg,glass);
 for(let axis=0;axis<2;axis++){
  for(let v=(axis?z0:x0)+1;v<(axis?z1:x1);v+=3.4){let last=null;for(let u=axis?x0:z0;u<(axis?x1:z1);u+=1.8){let x=axis?u:v,z=axis?v:u;if(inPolygon(x,z,poly)){let cur=new THREE.Vector3(x,roof(x,z)+.06,z);if(last)ribs.push(beam(last,cur,.05));last=cur;}else last=null;}}
 }
 if(ribs.length){mesh(scene,mergeGeometries(ribs),mats.metal);ribs.forEach(g=>g.dispose());}
 mesh(scene,flatGeometry(poly,f.base+.03),mats.floor,false);
 // Dark interior volume keeps unsurveyed interiors unreadable; no invented exhibition.
 const inner=flatGeometry(poly,f.base+.08);mesh(scene,inner,new THREE.MeshStandardMaterial({color:0x455747,roughness:1}),false);
}

function treeGeometry(type,detail){
 const rnd=seeded(501+type),leaves=[],wood=[];const trunkH=type===0?.55:.91;
 const trunk=new THREE.CylinderGeometry(.012,.023,trunkH,detail?8:5);trunk.translate(0,trunkH/2,0);wood.push(trunk);
 const n=type===0?(detail?54:1):(detail?32:2);
 for(let i=0;i<n;i++){
  let y,rr,sx,sy,sz,theta=i*2.39996;
  if(type===0){y=detail?.51+rnd()*.4:.72;rr=detail?(.5-Math.abs(y-.7))*.34:0;sx=detail?.048+rnd()*.039:.235;sy=detail?.06+rnd()*.05:.27;sz=sx;}
  else{y=detail?.23+i/n*.7:.43+i*.30;rr=(1-y)*(detail?.1:0);sx=(1-y)*(detail?.12:.28);sy=detail?.045:.25;sz=sx;}
  const x=Math.cos(theta)*rr,z=Math.sin(theta)*rr;
  const g=new THREE.SphereGeometry(1,detail?7:6,detail?5:4);const p=g.attributes.position;
  for(let v=0;v<p.count;v++){const f=1+(rnd()-.5)*.25;p.setXYZ(v,p.getX(v)*f,p.getY(v)*f,p.getZ(v)*f);}g.computeVertexNormals();g.scale(sx,sy,sz);g.translate(x,y,z);leaves.push(g);
  if(detail&&i%3===0)wood.push(beam(new THREE.Vector3(0,y-.15,0),new THREE.Vector3(x,y,z),.004));
 }
 const lg=mergeGeometries(leaves),wg=mergeGeometries(wood);leaves.forEach(g=>g.dispose());wood.forEach(g=>g.dispose());return {leaves:lg,wood:wg};
}

export async function buildWorld(scene,renderer,data,terrain,progress){
 const grassTex=noiseTexture('grass'),stoneTex=noiseTexture('stone'),roadTex=noiseTexture('road'),barkTex=noiseTexture('bark');
 const mats={grass:surfaceMaterial(0xffffff,grassTex),road:surfaceMaterial(0xcfcfc7,roadTex,.96),gravel:surfaceMaterial(0xd9cead,stoneTex,1),floor:surfaceMaterial(0xe1dcca,stoneTex),wall:surfaceMaterial(0xb3a997,stoneTex),roof:surfaceMaterial(0x4e5651,roadTex),metal:new THREE.MeshStandardMaterial({color:0xbfc5ba,metalness:.7,roughness:.42}),bark:surfaceMaterial(0xa79d85,barkTex)};
 mats.road.polygonOffset=true;mats.road.polygonOffsetFactor=-2;mats.gravel.polygonOffset=true;mats.gravel.polygonOffsetFactor=-2;
 scene.background=new THREE.Color(0xc5d3d2);scene.fog=new THREE.Fog(0xcbd8d5,2700,7800);
 const sky=new Sky();sky.scale.setScalar(15000);sky.material.uniforms.turbidity.value=2.4;sky.material.uniforms.rayleigh.value=1.6;sky.material.uniforms.mieCoefficient.value=.003;sky.material.uniforms.mieDirectionalG.value=.8;
 const sunDir=new THREE.Vector3(.72,.8,.36).normalize();sky.material.uniforms.sunPosition.value.copy(sunDir);scene.add(sky);
 const pmrem=new THREE.PMREMGenerator(renderer);const environment=new THREE.Scene();const envSky=sky.clone();environment.add(envSky);const envMap=pmrem.fromScene(environment,0.025,1,20000);scene.environment=envMap.texture;scene.environmentIntensity=.4;pmrem.dispose();
 const hemi=new THREE.HemisphereLight(0xd8e6ee,0x6b7755,1.1);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff3d7,3.1);scene.add(sun);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=1500;sun.shadow.normalBias=.12;sun.shadow.bias=-.00015;sun.shadow.radius=2;
 progress(25,'建立公开高程与地形');
 const t=data.terrain,groundG=new THREE.PlaneGeometry((t.nx-1)*t.step,(t.nz-1)*t.step,t.nx-1,t.nz-1);groundG.rotateX(-Math.PI/2);groundG.translate(t.x0+(t.nx-1)*t.step/2,0,t.z0+(t.nz-1)*t.step/2);
 const pos=groundG.attributes.position,col=[],uv=groundG.attributes.uv,c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),inside=inPolygon(x,z,data.boundary);pos.setY(i,terrain.height(x,z));uv.setXY(i,x/4,z/4);let patch=.5+.22*Math.sin(x*.021)*Math.cos(z*.037)+.15*Math.sin(x*.053+z*.03);c.set(inside?0x9ba679:0xb4b7a2);c.multiplyScalar(.83+patch*.21);col.push(c.r,c.g,c.b);}
 groundG.setAttribute('color',new THREE.Float32BufferAttribute(col,3));groundG.computeVertexNormals();mats.grass.vertexColors=true;mesh(scene,groundG,mats.grass,false);
 const border=[];for(const ring of data.boundary)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);for(let j=0;j<count;j++){const u=j/count,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;border.push(new THREE.Vector3(x,terrain.height(x,z)+.8,z));}}
 const boundaryLine=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(border),new THREE.LineDashedMaterial({color:0xb5c696,dashSize:8,gapSize:6,transparent:true,opacity:.7}));boundaryLine.computeLineDistances();scene.add(boundaryLine);
 const roadGroups={road:[],gravel:[]};
 for(const f of data.features.filter(f=>f.kind==='road'))for(const p of polygons(f.geometry))roadGroups.road.push(flatGeometry(p,(x,z)=>terrain.surface(x,z)+.11).toNonIndexed());
 for(const f of data.features.filter(f=>f.kind==='road'))for(const path of lines(f.geometry)){
  const verts=[],uvs=[];for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;
   const nx=-(b[1]-a[1])/len*f.width/2,nz=(b[0]-a[0])/len*f.width/2,n=Math.ceil(len/4);
   for(let j=0;j<n;j++){const aa=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],bb=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n];const q=[[aa[0]+nx,aa[1]+nz],[bb[0]+nx,bb[1]+nz],[aa[0]-nx,aa[1]-nz],[bb[0]-nx,bb[1]-nz]];
    for(const k of [0,1,2,2,1,3]){const [x,z]=q[k];verts.push(x,terrain.surface(x,z)+.10,z);uvs.push(x/2,z/2);}}
  }
  if(verts.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();roadGroups[['path','track'].includes(f.tags.highway)?'gravel':'road'].push(g);}
 }
 for(const [key,arr] of Object.entries(roadGroups)){if(arr.length)mesh(scene,mergeGeometries(arr),mats[key],false);arr.forEach(g=>g.dispose());}
 progress(40,'建立水体、建筑轮廓与温室样板');await new Promise(r=>setTimeout(r,0));
 const waterTime={value:0};
 const waterM=new THREE.MeshPhysicalMaterial({color:0x607d70,roughness:.24,metalness:.05,transparent:true,opacity:.91,envMapIntensity:.68,side:THREE.DoubleSide});
 waterM.onBeforeCompile=shader=>{shader.uniforms.uTime=waterTime;shader.vertexShader='varying vec2 vWater;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWater = position.xz;');shader.fragmentShader='uniform float uTime; varying vec2 vWater;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = normalize(normal + vec3(sin(vWater.x*1.3+uTime*.65)*.027, cos(vWater.y*1.7-uTime*.5)*.027,0.));');};
 for(const f of data.features){if(f.kind==='water')for(const p of polygons(f.geometry))mesh(scene,flatGeometry(p,f.level),waterM,false);
  if(f.kind==='building')for(const p of polygons(f.geometry)){
   const foundationBottom=Math.min(...p[0].map(q=>terrain.renderHeight(...q)))-.25;
   if(foundationBottom<f.base){const foundation=new THREE.ExtrudeGeometry(shapeOf(p),{depth:f.base-foundationBottom+.22,bevelEnabled:false});foundation.rotateX(-Math.PI/2);foundation.translate(0,foundationBottom,0);mesh(scene,foundation,mats.wall);}
   if(f.id==='225648931'){buildGreenhouse(scene,p,f,mats);continue;}
   const g=new THREE.ExtrudeGeometry(shapeOf(p),{depth:f.height,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,f.base,0);mesh(scene,g,mats.wall);
   // Flat caps deliberately avoid inventing distinctive roof forms in unsurveyed buildings.
   mesh(scene,flatGeometry(p,f.base+f.height+.035),mats.roof);
  }
 }
 progress(62,'按分区配置实例化植被');await new Promise(r=>setTimeout(r,0));
 const chunks=new Map();for(const a of data.trees){const key=`${Math.floor(a[0]/80)},${Math.floor(a[1]/80)},${a[2]}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(a);}
 const treeGeos=Array.from({length:3},(_,i)=>[treeGeometry(i,false),treeGeometry(i,true)]),treeMats=[0x566846,0x3c5546,0x507159].map(color=>new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0}));
 const treeChunks=[],dummy=new THREE.Object3D(),color=new THREE.Color();
 // Spatial batches keep distant trees outside a ground-level frustum off the GPU.
 // A single park-wide instance bound would keep all 8,029 trees submitted at once.
 const farKey=([x,z,type])=>`${Math.floor(x/240)},${Math.floor(z/240)},${type}`;
 const farCounts=new Map();for(const a of data.trees){const key=farKey(a);farCounts.set(key,(farCounts.get(key)||0)+1);}
 const far=new Map([...farCounts].map(([key,count])=>{const type=Number(key.split(',')[2]),geo=treeGeos[type][0],leaves=new THREE.InstancedMesh(geo.leaves,treeMats[type],count),wood=new THREE.InstancedMesh(geo.wood,mats.bark,count);leaves.castShadow=true;leaves.receiveShadow=true;wood.castShadow=false;scene.add(leaves,wood);return [key,{leaves,wood,next:0}];}));
 for(const entries of chunks.values()){
  const cx=entries.reduce((s,a)=>s+a[0],0)/entries.length,cz=entries.reduce((s,a)=>s+a[1],0)/entries.length,records=[];
   const sub=new THREE.Group(),geo=treeGeos[entries[0][2]][1];
   const leaves=new THREE.InstancedMesh(geo.leaves,treeMats[entries[0][2]],entries.length),wood=new THREE.InstancedMesh(geo.wood,mats.bark,entries.length);
   for(let i=0;i<entries.length;i++){const [x,z,type,h,rnd]=entries[i];dummy.position.set(x,terrain.renderHeight(x,z),z);dummy.rotation.y=rnd*Math.PI*2;dummy.scale.set(h*(.91+rnd*.14),h,h*(1.04-rnd*.14));dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);wood.setMatrixAt(i,dummy.matrix);color.setRGB(.86+rnd*.22,.9+rnd*.13,.82+rnd*.14);leaves.setColorAt(i,color);const batch=far.get(farKey(entries[i])),idx=batch.next++;batch.leaves.setMatrixAt(idx,dummy.matrix);batch.wood.setMatrixAt(idx,dummy.matrix);batch.leaves.setColorAt(idx,color);records.push({batch,idx,matrix:dummy.matrix.clone()});}
   leaves.castShadow=true;leaves.receiveShadow=true;wood.castShadow=true;leaves.computeBoundingSphere();wood.computeBoundingSphere();sub.add(leaves,wood);sub.visible=false;
   scene.add(sub);treeChunks.push({sub,cx,cz,records,near:false});
 }
 for(const f of far.values()){f.leaves.computeBoundingSphere();f.wood.computeBoundingSphere();}
 progress(90,'连接定位、漫游与小地图');
 let shadowFocus=new THREE.Vector3(Infinity,Infinity,Infinity),oldQuality='',oldNear='';const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
 renderer.shadowMap.autoUpdate=false;
 function update(camera,focus,quality,time){
  waterTime.value=time;
  let nearKey='';for(const chunk of treeChunks){const {cx,cz,sub,records}=chunk;const near=Math.hypot(camera.position.x-cx,camera.position.z-cz)<(quality==='high'?145:quality==='medium'?100:0)&&camera.position.y-terrain.height(cx,cz)<200;if(near!==chunk.near){sub.visible=near;chunk.near=near;for(const r of records){const f=r.batch;f.leaves.setMatrixAt(r.idx,near?hiddenMatrix:r.matrix);f.wood.setMatrixAt(r.idx,near?hiddenMatrix:r.matrix);f.leaves.instanceMatrix.needsUpdate=true;f.wood.instanceMatrix.needsUpdate=true;}}nearKey+=near?'1':'0';}
  const span=quality==='high'?230:150;
  if(shadowFocus.distanceToSquared(focus)>4||oldQuality!==quality||oldNear!==nearKey){const fy=terrain.height(focus.x,focus.z);sun.target.position.set(focus.x,fy,focus.z);sun.position.copy(sun.target.position).addScaledVector(sunDir,650);renderer.shadowMap.needsUpdate=true;shadowFocus.copy(focus);oldQuality=quality;oldNear=nearKey;}
  const cam=sun.shadow.camera;if(cam.right!==span){cam.left=cam.bottom=-span;cam.right=cam.top=span;cam.updateProjectionMatrix();}
 }
 return {update,sun,treeChunks,boundaryLine,mats};
}

