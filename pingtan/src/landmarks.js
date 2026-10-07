import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {inside} from './geo.js';
import {random} from './materials.js';

// Shape variations below model rock surfaces only. Geographic outlines and
// dimensions come from the explicitly classified landscape inventory.
function geometry(pos,uv,index){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(index)g.setIndex(index);g.computeVertexNormals();g.computeBoundingSphere();return g;}
function rockyMaterial(base,color){
 const m=base.clone();m.color.setHex(color);m.roughness=.95;m.metalness=0;m.envMapIntensity=.13;
 // Triplanar, metre-scale colour sampling prevents stretched cliff colours.
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lWorld;varying vec3 lNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nlWorld=(modelMatrix*vec4(transformed,1.)).xyz;lNormal=normalize(mat3(modelMatrix)*objectNormal);');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 lWorld;varying vec3 lNormal;
float lhash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,71.4)))*43758.5453);}
float ln(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lhash(i),lhash(i+vec3(1,0,0)),f.x),mix(lhash(i+vec3(0,1,0)),lhash(i+vec3(1,1,0)),f.x),f.y),mix(mix(lhash(i+vec3(0,0,1)),lhash(i+vec3(1,0,1)),f.x),mix(lhash(i+vec3(0,1,1)),lhash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`).replace('#include <map_fragment>',`#ifdef USE_MAP
vec3 weights=pow(abs(lNormal),vec3(5.));weights/=max(.001,weights.x+weights.y+weights.z);
vec3 tri=texture2D(map,lWorld.yz*.26).rgb*weights.x+texture2D(map,lWorld.xz*.26).rgb*weights.y+texture2D(map,lWorld.xy*.26).rgb*weights.z;
diffuseColor.rgb*=pow(tri,vec3(.72));
#endif
float weather=ln(lWorld*.035),grain=ln(lWorld*.7);
float seams=pow(1.-abs(sin(lWorld.y*.55+ln(lWorld*.09)*2.)),20.);
diffuseColor.rgb*=mix(.82,1.19,weather)*mix(.90,1.06,grain)*(1.-seams*.13);
diffuseColor.rgb*=mix(.58,1.,smoothstep(.15,3.2,lWorld.y));
`);
 };m.customProgramCacheKey=()=> 'landmark-triplanar-v1';return m;
}
function boulderGeometry(){
 const g=new THREE.SphereGeometry(1,32,24),v=g.attributes.position;
 for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),a=1+.07*Math.sin(x*8+z*6)*Math.cos(y*10)+.025*Math.sin(y*27+z*13);v.setXYZ(i,x*a,y*a,z*a);}g.computeVertexNormals();return g;
}
function rockInstances(group,list,geo,material,seed){
 const mesh=new THREE.InstancedMesh(geo,material,list.length),o=new THREE.Object3D(),rng=random(seed);
 list.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(...p.scale);o.rotation.set((rng()-.5)*.3,rng()*Math.PI*2,(rng()-.5)*.3);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color().setScalar(.85+rng()*.22));});mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);return mesh;
}
function railPath(group,points,material){
 const sections=[];
 function beam(a,b,r){const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());sections.push(g);}
 for(let i=0;i<points.length;i++){const a=points[i];beam(a,a.clone().add(new THREE.Vector3(0,1.1,0)),.05);if(i){for(const y of [.55,1.05])beam(points[i-1].clone().add(new THREE.Vector3(0,y,0)),a.clone().add(new THREE.Vector3(0,y,0)),.037);}}
 const g=mergeGeometries(sections),m=new THREE.Mesh(g,material);sections.forEach(g=>g.dispose());m.castShadow=m.receiveShadow=true;group.add(m);
}
function wellModel(group,p,ground,rock,white,data){
 const n=160,levels=50,pos=[],uv=[],idx=[],bottom=.14,top=43.14;
 // Inner wall, with three real openings in the mesh, not a dark decal.
 const radius=a=>25*(1+.05*Math.sin(3*a+.3)+.025*Math.sin(7*a));
 for(let j=0;j<=levels;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,t=j/levels,y=bottom+t*(43+.5*Math.sin(a*9)),r=radius(a)+(1-t)*1.8+Math.sin(t*Math.PI)*(.8*Math.sin(a*11+t*7)+.22*Math.sin(a*41+t*17));pos.push(p.x+r*Math.cos(a),y,p.z+r*Math.sin(a));uv.push(i/n*40,t*16);}
 const passages=[-.5,.03,.55];
 for(let j=0;j<levels;j++)for(let i=0;i<n;i++){
  const a=(i+.5)/n*Math.PI*2,y=(j+.5)/levels*43;
  const opening=passages.some(c=>{const da=Math.atan2(Math.sin(a-c),Math.cos(a-c));return Math.abs(da)<.11&&y<6*Math.sqrt(Math.max(0,1-(da/.11)**2));});
  if(opening)continue;const k=j*(n+1)+i;idx.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);
 }
 const wall=new THREE.Mesh(geometry(pos,uv,idx),rock);wall.material.side=THREE.DoubleSide;wall.receiveShadow=true;group.add(wall);wall.name='仙人井 · 约50m口径/43m深 · 三通海洞近似';
 // Irregular rim blends into source DEM over 75m and stops at actual coastline.
 const rimPos=[],rimUv=[],rimIndex=[],rows=34;
 for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=radius(a)+j/rows*75,x=p.x+r*Math.cos(a),z=p.z+r*Math.sin(a);rimPos.push(x,ground.height(x,z)+.045,z);rimUv.push(x/4,z/4);}
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i,x=(rimPos[k*3]+rimPos[(k+n+2)*3])/2,z=(rimPos[k*3+2]+rimPos[(k+n+2)*3+2])/2;if(ground.inside(x,z))rimIndex.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
 const rimMat=rock.clone();rimMat.onBeforeCompile=s=>{rock.onBeforeCompile(s);Object.assign(s.uniforms,{patchCentre:{value:new THREE.Vector2(p.x,p.z)},patchSatellite:{value:data.satellite||data.field},patchBounds:{value:new THREE.Vector4(data.meta.x0,data.meta.z0,data.meta.width,data.meta.depth)}});s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 patchCentre;uniform sampler2D patchSatellite;uniform vec4 patchBounds;').replace('#include <roughnessmap_fragment>',`float rimBlend=smoothstep(35.,90.,length(lWorld.xz-patchCentre));
vec2 puv=vec2((lWorld.x-patchBounds.x)/patchBounds.z,1.-(lWorld.z-patchBounds.y)/patchBounds.w);
diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(patchSatellite,puv).rgb,rimBlend);
#include <roughnessmap_fragment>`);};rimMat.customProgramCacheKey=()=> 'well-rim-satellite-blend-v1';
 const rim=new THREE.Mesh(geometry(rimPos,rimUv,rimIndex),rimMat);rim.receiveShadow=true;group.add(rim);
 const coast=data.geo.coastlines[data.geo.mainIsland],cliffPos=[],cliffUv=[];
 for(let i=1;i<coast.length;i++){const a=coast[i-1],b=coast[i];if(Math.min(Math.hypot(a[0]-p.x,a[1]-p.z),Math.hypot(b[0]-p.x,b[1]-p.z))>98)continue;const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/2));for(let j=0;j<n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n,xx=a[0]+(b[0]-a[0])*(j+1)/n,zz=a[1]+(b[1]-a[1])*(j+1)/n,h=ground.height(x,z),hh=ground.height(xx,zz),theta=Math.atan2((z+zz)/2-p.z,(x+xx)/2-p.x),r=Math.hypot((x+xx)/2-p.x,(z+zz)/2-p.z),rows=Math.max(1,Math.ceil(Math.max(h,hh)/1.4));for(let k=0;k<rows;k++){const u=k/rows,v=(k+1)/rows,y0=-.6+(h+.6)*u,y1=-.6+(h+.6)*v,yy0=-.6+(hh+.6)*u,yy1=-.6+(hh+.6)*v,mid=(y0+y1+yy0+yy1)/4;if(passages.some(a=>{const side=Math.sin(theta-a)*r;return Math.abs(side)<2.8&&mid<6*Math.sqrt(Math.max(0,1-(side/2.8)**2));}))continue;cliffPos.push(x,y0,z,xx,yy0,zz,x,y1,z,x,y1,z,xx,yy0,zz,xx,yy1,zz);cliffUv.push(0,u*12,2,u*12,0,v*12,0,v*12,2,u*12,2,v*12);}}}
 const seaCliff=new THREE.Mesh(geometry(cliffPos,cliffUv),rock);seaCliff.castShadow=seaCliff.receiveShadow=true;group.add(seaCliff);
 const tunnels=[];for(const a of passages){let length=28;while(length<120&&ground.inside(p.x+Math.cos(a)*length,p.z+Math.sin(a)*length))length+=1;const tp=[],tu=[],ti=[],rows=30,n=32;for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){const q=i/n*Math.PI,r=26+(length-23)*j/rows,side=Math.cos(q)*2.8;tp.push(p.x+Math.cos(a)*r-Math.sin(a)*side,.14+Math.sin(q)*6,p.z+Math.sin(a)*r+Math.cos(a)*side);tu.push(i/n*4,j/rows*8);}for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;ti.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}const tunnel=new THREE.Mesh(geometry(tp,tu,ti),rock);tunnel.receiveShadow=true;group.add(tunnel);tunnels.push(tunnel);}
 const waterMaterial=new THREE.MeshStandardMaterial({color:0x245a59,roughness:.42,metalness:0,envMapIntensity:.2,side:THREE.DoubleSide});
 const water=new THREE.Mesh(new THREE.CircleGeometry(28,96),waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(p.x,bottom+.015,p.z);group.add(water);
 const walkPoints=[];for(let i=0;i<=38;i++){const a=1.3+i/38*3.1,r=37,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;walkPoints.push(new THREE.Vector3(x,ground.height(x,z)+.22,z));}
 const strip=[];for(let i=0;i<walkPoints.length;i++){const v=walkPoints[i],a=1.3+i/38*3.1;for(const d of [-1.2,1.2])strip.push(v.x+Math.cos(a)*d,v.y,v.z+Math.sin(a)*d);}
 const wi=[];for(let i=0;i<walkPoints.length-1;i++){const k=i*2;wi.push(k,k+2,k+1,k+1,k+2,k+3);}
 const walk=new THREE.Mesh(geometry(strip,strip.flatMap((_,i)=>i%3===0?[0,0]:[]),wi),new THREE.MeshStandardMaterial({color:0x9a9381,roughness:.95,side:THREE.DoubleSide}));walk.receiveShadow=true;group.add(walk);railPath(group,walkPoints,white);
 const stones=[],rng=random(161);for(let i=0;i<28;i++){const a=rng()*Math.PI*2,r=17+rng()*6,s=.7+rng()*1.7;stones.push({x:p.x+Math.cos(a)*r,y:-.08,z:p.z+Math.sin(a)*r,scale:[s,.25+rng()*.45,s*.8]});}rockInstances(group,stones,boulderGeometry(),rock,10);
 const poolTime={value:0};waterMaterial.onBeforeCompile=s=>{s.uniforms.poolTime=poolTime;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 poolUV;').replace('#include <begin_vertex>','#include <begin_vertex>\npoolUV=position.xy;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 poolUV;uniform float poolTime;').replace('#include <color_fragment>',`#include <color_fragment>
float ripple=sin(poolUV.x*1.8+poolTime*1.5)*sin(poolUV.y*2.7-poolTime*.9);float edge=smoothstep(17.,26.,length(poolUV));float wash=pow(.5+.5*sin(poolUV.y*.7+poolTime*2.+sin(poolUV.x*.43)),10.);diffuseColor.rgb=mix(vec3(.024,.082,.072),vec3(.46,.54,.48),wash*edge*.6)*(.97+ripple*.08);`);};
 return {wall,water,radius,top,bottom,poolTime,tunnels};
}
function caveModel(group,p,ground,black,geo){
 // A lopsided fractured rock buttress surrounding a continuous cavity. No fake
 // island outline: this mesh is a local photographic interpretation at the shore.
 const pieces=[],base=Math.max(.2,ground.height(p.x,p.z)),frame=new THREE.Group();frame.position.set(p.x,base,p.z);frame.rotation.y=p.heading;group.add(frame);
 function shell(type){const n=112,rows=type==='face'?22:38,pos=[],uv=[],ix=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI,t=j/rows,c=Math.cos(a),s=Math.sin(a);let x,y,z;
   if(type==='face'){const r=4+t*13;x=c*r*(1+.06*Math.sin(a*9))+Math.pow(s,2)*1.1;y=s*(7+t*7.5)*(1+.065*Math.sin(a*5+.4));z=(.7*Math.sin(a*7)+.3*Math.cos(a*17))*t+.18*Math.sin(a*26+t*13);}
   else{const outer=type==='outer',r=outer?17:4;x=c*r*(1+.05*Math.sin(a*9+t*6))+(outer?1.1:0)*s*s;y=s*(outer?14.5:7)*(1+.06*Math.sin(a*5+t*7));z=t*14+(outer?Math.sin(a*7)*.7:0);}
   pos.push(x,y,z);uv.push(i/n*10,j/rows*6);
  }for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;ix.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}return geometry(pos,uv,ix);
 }
 for(const type of ['face','outer','inner']){const m=type==='inner'?black.clone():black;if(type==='inner'){m.color.multiplyScalar(.57);m.onBeforeCompile=black.onBeforeCompile;m.customProgramCacheKey=black.customProgramCacheKey;}m.side=THREE.DoubleSide;const mesh=new THREE.Mesh(shell(type),m);mesh.castShadow=mesh.receiveShadow=true;frame.add(mesh);pieces.push(mesh);}
 // A blind rear chamber gives the photographed dark recess, while the front is
 // genuinely open geometry. Individual ledges soften the buttress outline.
 const back=new THREE.Mesh(new THREE.CircleGeometry(1,64,0,Math.PI),black.clone());back.scale.set(4,7,1);back.position.z=14;back.material.color.multiplyScalar(.35);back.material.side=THREE.DoubleSide;frame.add(back);
 const cliff=frame;cliff.name='镜沙裂隙黑礁与海蚀洞 · 照片近似';
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,14,12,16),black);floor.rotation.x=-Math.PI/2;floor.position.set(0,.02,7);floor.receiveShadow=true;frame.add(floor);
 const rng=random(58),list=[];
 for(let i=0;i<170;i++){const along=(rng()-.5)*130,seaward=-rng()*24-1,x=p.x+along*Math.cos(p.heading)+seaward*Math.sin(p.heading),z=p.z+seaward*Math.cos(p.heading)-along*Math.sin(p.heading);if(Math.hypot(x-p.x,z-p.z)<10)continue;const s=.8+rng()*3.5;list.push({x,y:Math.max(.02,ground.height(x,z))+s*.2,z,scale:[s,s*.65,s*.9]});}
 for(const [x,z,s] of [[-14,4,6],[15,5,7],[-16,11,5],[14,12,6]]){const xx=p.x+x*Math.cos(p.heading)+z*Math.sin(p.heading),zz=p.z+z*Math.cos(p.heading)-x*Math.sin(p.heading);list.push({x:xx,z:zz,y:base+s*.48,scale:[s,s,s*.8]});}
 rockInstances(group,list,geo,black,59);return {cliff,base};
}
function pillar(group,x,z,h,width,depth,rock,lean){
 const n=64,rows=65,pos=[],uv=[],idx=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){
  const a=i/n*Math.PI*2,t=j/rows,cap=Math.sqrt(Math.max(.001,1-Math.pow(Math.max(0,(t-.80)/.2),2))),foot=.75+.22*Math.sin(t*Math.PI),rough=1+.025*Math.sin(a*7+t*34)+.016*Math.sin(a*13-t*70),r=foot*cap*rough;
  const ca=Math.cos(a),sa=Math.sin(a),sx=Math.sign(ca)*Math.pow(Math.abs(ca),.30),sz=Math.sign(sa)*Math.pow(Math.abs(sa),.30);
  pos.push(x+sx*width*.5*r+t*lean,1+t*h,z+sz*depth*.5*r+.4*Math.sin(t*4));uv.push(i/n*10,t*14);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
 const mesh=new THREE.Mesh(geometry(pos,uv,idx),rock);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function footprintSurface(group,p,ground,rock,minimum=.6){
 const points=p.footprint.slice(0,-1).map(v=>new THREE.Vector2(...v)),faces=THREE.ShapeUtils.triangulateShape(points,[]),pos=[],uv=[];
 function tri(a,b,c,depth=0){const l=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],i=l.indexOf(Math.max(...l));if(l[i]>12*12&&depth<15){const q=[a,b,c],u=q[i],v=q[(i+1)%3],w=q[(i+2)%3],m=u.clone().add(v).multiplyScalar(.5);tri(u,m,w,depth+1);tri(m,v,w,depth+1);return;}for(const v of [a,c,b]){pos.push(v.x,Math.max(minimum,ground.collisionHeight(v.x,v.y))+.18,v.y);uv.push(v.x/4,v.y/4);}}
 for(const f of faces)tri(...f.map(i=>points[i]));const mesh=new THREE.Mesh(geometry(pos,uv),rock);mesh.receiveShadow=true;group.add(mesh);
 const side=[],suv=[];for(let i=1;i<p.footprint.length;i++){const a=p.footprint[i-1],b=p.footprint[i],len=Math.hypot(a[0]-b[0],a[1]-b[1]),n=Math.max(1,Math.ceil(len/8));for(let k=0;k<n;k++){const u=k/n,v=(k+1)/n,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u,xx=a[0]+(b[0]-a[0])*v,zz=a[1]+(b[1]-a[1])*v,h=Math.max(minimum,ground.collisionHeight(x,z))+.18,hh=Math.max(minimum,ground.collisionHeight(xx,zz))+.18;side.push(x,-.5,z,xx,-.5,zz,x,h,z,x,h,z,xx,-.5,zz,xx,hh,zz);suv.push(0,0,2,0,0,2,0,2,2,0,2,2);}}
 const skirt=new THREE.Mesh(geometry(side,suv),rock);skirt.material.side=THREE.DoubleSide;skirt.receiveShadow=true;group.add(skirt);return mesh;
}
export function createLandmarks(scene,data,ground,mat){
 const all=new THREE.Group();all.name='Source-located landscape details / explicit approximate models';scene.add(all);
 const groups=[],geo=boulderGeometry(),black=rockyMaterial(mat.rock,0x343d38),granite=rockyMaterial(mat.rock,0xf1e8d4),wellRock=rockyMaterial(mat.rock,0xe6d5ba),white=new THREE.MeshStandardMaterial({color:0xcdcbc0,roughness:.75});
 let well,cave;
 for(const p of data.landmarks.places){
  const group=new THREE.Group();group.name=p.name;group.userData={source:p.source,classification:p.accuracy};all.add(group);groups.push({group,p});
  if(p.kind==='well')well=wellModel(group,p,ground,wellRock,white,data);
  if(p.kind==='cave')cave=caveModel(group,p,ground,black,geo);
  if(p.kind==='pillars'){footprintSurface(group,p,ground,granite,1);pillar(group,p.x+8,p.z-5,33,11,9,granite,-1.5);pillar(group,p.x-13,p.z+4,17,16,9,granite,1.7);}
  if(p.kind==='granite-islet'||p.kind==='weathered-rocks'){
   if(p.footprint)footprintSurface(group,p,ground,granite);
   const rng=random(p.kind==='granite-islet'?42:47),list=[];
   for(let i=0;i<220;i++){const x=p.x+(rng()-.5)*(p.footprint?270:240),z=p.z+(rng()-.5)*(p.footprint?260:210);if(p.footprint&&!inside(x,z,p.footprint))continue;const s=1.5+rng()*6;list.push({x,y:ground.collisionHeight(x,z)+s*.15,z,scale:[s,s*.6,s*.8]});}rockInstances(group,list,geo,granite,45);
  }
 }
 // Coast texture affects only the local reference area and never substitutes an
 // artificial coastline. Detail groups are culled by distance and footprint.
 return {group:all,groups,well,cave,update(camera,quality,t){
  for(const {group,p} of groups){const d=Math.hypot(camera.position.x-p.x,camera.position.z-p.z,camera.position.y);group.visible=d<(p.kind==='pillars'?16000:quality==='low'?3200:6500);group.traverse(o=>{if(o.isMesh)o.castShadow=quality==='high';});}
  if(well){well.water.position.y=.155+.025*Math.sin(t*1.4);well.poolTime.value=t;}
 }};
}
