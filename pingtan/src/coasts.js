import * as THREE from 'three';
import {inside,centre} from './geo.js';
import {random} from './materials.js';

// Source footprints, including intertidal beach polygons; no artificial island edge.
function drapedPolygon(area,ground,maxEdge=24){
 const ring=area.points.slice(0,-1).map(p=>new THREE.Vector2(...p)),holes=area.holes.map(h=>h.slice(0,-1).map(p=>new THREE.Vector2(...p))),vertices=[...ring,...holes.flat()],faces=THREE.ShapeUtils.triangulateShape(ring,holes),pos=[],uv=[];
 function triangle(a,b,c,depth=0){
  const lens=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],i=lens.indexOf(Math.max(...lens));
  if(lens[i]>maxEdge*maxEdge&&depth<20){const p=[a,b,c],u=p[i],v=p[(i+1)%3],w=p[(i+2)%3],m=u.clone().add(v).multiplyScalar(.5);triangle(u,m,w,depth+1);triangle(m,v,w,depth+1);return;}
  // Some OSM beaches extend seaward of coastline. Render their real extent as a
  // low exposed intertidal surface. Height/tide is a visual approximation.
  for(const p of [a,c,b]){pos.push(p.x,Math.max(.055,ground.collisionHeight(p.x,p.y))+.38,p.y);uv.push(p.x/3,p.y/3);}
 }
 for(const f of faces)triangle(...f.map(i=>vertices[i]));
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function sandMaterial(data){
 const b=data.geo.metadata.bounds,material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96,envMapIntensity:.13,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{
  const cave=data.landmarks.places.find(p=>p.kind==='cave');Object.assign(s.uniforms,{coastalField:{value:data.waterField},geoBounds:{value:new THREE.Vector4(b.x0,b.z0,b.width,b.depth)},caveCut:{value:new THREE.Vector3(cave.x,cave.z,cave.heading)}});
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSandWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSandWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vSandWorld;uniform sampler2D coastalField;uniform vec4 geoBounds;
uniform vec3 caveCut;
float shash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float snoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(shash(i),shash(i+vec2(1,0)),f.x),mix(shash(i+vec2(0,1)),shash(i+1.),f.x),f.y);}
`).replace('#include <color_fragment>',`#include <color_fragment>
vec2 guv=vec2((vSandWorld.x-geoBounds.x)/geoBounds.z,1.-(vSandWorld.z-geoBounds.y)/geoBounds.w);
vec2 cp=vSandWorld.xz-caveCut.xy;vec2 cl=vec2(cp.x*cos(caveCut.z)-cp.y*sin(caveCut.z),cp.x*sin(caveCut.z)+cp.y*cos(caveCut.z));if(abs(cl.x)<4.&&cl.y>=0.&&cl.y<=14.)discard;
float inland=(texture2D(coastalField,guv).g*255.-128.)*4.;
float wet=1.-smoothstep(-20.,65.,inland);
float grain=mix(.5,snoise(vSandWorld.xz*2.8),1.-smoothstep(.15,.7,max(length(dFdx(vSandWorld.xz)),length(dFdy(vSandWorld.xz))))),broad=snoise(vSandWorld.xz*.022);
vec3 dry=mix(vec3(.28,.215,.145),vec3(.43,.355,.245),broad);
vec3 damp=mix(vec3(.16,.14,.095),vec3(.26,.22,.145),broad);
diffuseColor.rgb=mix(dry,damp,wet*.55)*mix(.94,1.045,grain);
`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float detailFade=1.-smoothstep(.12,.8,max(length(dFdx(vSandWorld.xz)),length(dFdy(vSandWorld.xz))));
vec3 sandSlope=normalize(vec3(.025*sin(vSandWorld.x*24.)*detailFade,1.,.018*cos(vSandWorld.z*29.)*detailFade));
normal=normalize(normal+((viewMatrix*vec4(sandSlope-vec3(0,1,0),0.)).xyz));
`);
 };material.customProgramCacheKey=()=> 'mapped-sand-v2';return material;
}
export function createCoasts(scene,data,ground,mat){
 const group=new THREE.Group();group.name='Mapped beaches and differentiated rock coasts';scene.add(group);
 const material=sandMaterial(data),beaches=data.geo.areas.filter(a=>a.kind==='beach'),meshes=[];
 for(const a of beaches){const mesh=new THREE.Mesh(drapedPolygon(a,ground),material);mesh.name=`${a.tags.name||'Mapped beach'} ${a.id}`;mesh.receiveShadow=true;mesh.userData={source:a.id,footprint:'OSM unchanged',height:'DEM drape / exposed intertidal approximation'};group.add(mesh);meshes.push(mesh);}
 const rng=random(724),coast=data.geo.coastlines[data.geo.mainIsland],grey=[],dark=[];
 let last=null;
 for(const p of coast){
  const north=p[1]<-13600&&p[0]>-1900&&p[0]<1500,beigang=Math.hypot(p[0]-4500,p[1]+6340)<760;
  if(!north&&!beigang)continue;if(last&&Math.hypot(p[0]-last[0],p[1]-last[1])<18)continue;
  if(beaches.some(a=>inside(...p,a.points)))continue;last=p;
  const bucket=north?dark:grey;
  for(let k=0;k<3;k++){const x=p[0]+(rng()-.5)*10,z=p[1]+(rng()-.5)*10,scale=(north?2.4:1.1)+rng()*(north?5.5:3.0);bucket.push({x,z,scale,north});}
 }
 const rockGeo=new THREE.SphereGeometry(1,26,18),v=rockGeo.attributes.position;
 for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),f=1+.095*Math.sin(x*7+z*4)*Math.cos(y*9)+.045*Math.sin(z*17+y*8);v.setXYZ(i,x*f,y*f,z*f);}rockGeo.computeVertexNormals();
 const rockMeshes=[];
 for(const [list,color,name] of [[grey,0xb4a990,'北港圆钝花岗岩岸 · 外观近似'],[dark,0x737771,'北部基岩岸 · 外观近似']]){
  const m=mat.rock.clone();m.color.setHex(color);const mesh=new THREE.InstancedMesh(rockGeo,m,list.length),o=new THREE.Object3D();
  list.forEach((p,i)=>{o.position.set(p.x,Math.max(-.4,ground.height(p.x,p.z))+p.scale*.15,p.z);o.scale.set(p.scale,p.scale*(p.north?.62:.48),p.scale*.78);o.rotation.set((rng()-.5)*.3,rng()*Math.PI*2,(rng()-.5)*.2);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color().setScalar(.82+rng()*.25));});mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);rockMeshes.push(mesh);
 }
 return {group,beaches,meshes,rockMeshes,counts:{beaches:beaches.length,rocks:grey.length+dark.length},update(camera,quality){for(const m of rockMeshes){m.visible=camera.position.y<(quality==='low'?1100:4000);m.castShadow=quality==='high';}}};
}
