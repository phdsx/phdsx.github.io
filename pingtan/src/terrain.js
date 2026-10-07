import * as THREE from 'three';
import {sample,inside} from './geo.js';
export function createTerrain(scene,data){
 const {meta,surface,field,satellite,geo,land}=data, bounds=geo.metadata.bounds;
 function triangleHeight(x,z,step=40){
  const xx=Math.max(meta.x0,Math.min(meta.x0+meta.width-.001,x)),zz=Math.max(meta.z0,Math.min(meta.z0+meta.depth-.001,z)),u=(xx-meta.x0)/step,v=(zz-meta.z0)/step,i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,gx=meta.x0+i*step,gz=meta.z0+j*step;
  const h00=sample(meta,surface,gx,gz),h10=sample(meta,surface,gx+step,gz),h01=sample(meta,surface,gx,gz+step),h11=sample(meta,surface,gx+step,gz+step);
  return Math.max(0,a+b<=1?h00+(h10-h00)*a+(h01-h00)*b:h11+(h01-h11)*(1-a)+(h10-h11)*(1-b));
 }
 const sourceHeight=(x,z)=>triangleHeight(x,z,40),well=data.landmarks.places.find(p=>p.kind==='well'),cave=data.landmarks.places.find(p=>p.kind==='cave'),caveBase=sourceHeight(cave.x,cave.z)+.25;
 const wellRadius=a=>25*(1+.05*Math.sin(3*a+.3)+.025*Math.sin(7*a));
 function visualHeight(x,z){
  const cx=x-cave.x,cz=z-cave.z,lx=cx*Math.cos(cave.heading)-cz*Math.sin(cave.heading),lz=cx*Math.sin(cave.heading)+cz*Math.cos(cave.heading);
  if(Math.abs(lx)<4&&lz>=0&&lz<=14)return caveBase;
  const dx=x-well.x,dz=z-well.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx),rim=wellRadius(a),base=sourceHeight(x,z);
  if(r<rim-.0001)return .14;
  if(r>=rim+75)return base;
  const u=THREE.MathUtils.clamp((r-rim)/75,0,1),blend=1-u*u*(3-2*u);
  return base+(43.14+Math.sin(a*9)*.5-base)*blend;
 }
 const height=visualHeight;
 const material=new THREE.MeshStandardMaterial({map:satellite||null,color:satellite?0xffffff:0x8e9c78,roughness:.98,metalness:0});
 const uniforms={groundGrain:{value:null},hasGrain:{value:0}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.uniforms.coastalField={value:field};shader.uniforms.geoBounds={value:new THREE.Vector4(bounds.x0,bounds.z0,bounds.width,bounds.depth)};
  shader.uniforms.wellCenter={value:new THREE.Vector2(well.x,well.z)};
  shader.uniforms.caveCut={value:new THREE.Vector3(cave.x,cave.z,cave.heading)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGeoWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGeoWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vGeoWorld;
uniform sampler2D coastalField;
uniform vec4 geoBounds;
uniform sampler2D groundGrain;
uniform float hasGrain;
uniform vec2 wellCenter;
uniform vec3 caveCut;
float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float softnoise(vec2 p){vec2 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(grain(a),grain(a+vec2(1,0)),b.x),mix(grain(a+vec2(0,1)),grain(a+vec2(1,1)),b.x),b.y);}
`).replace('#include <map_fragment>',`#include <map_fragment>
vec2 guv=vec2((vGeoWorld.x-geoBounds.x)/geoBounds.z,1.-(vGeoWorld.z-geoBounds.y)/geoBounds.w);
vec3 cf=texture2D(coastalField,guv).rgb;
vec2 wp=vGeoWorld.xz-wellCenter;float wa=atan(wp.y,wp.x);
float wr=25.*(1.+.05*sin(3.*wa+.3)+.025*sin(7.*wa));
if(length(wp)<wr+75.)discard; // replace coarse DEM with classified local well/rim mesh
vec2 cp=vGeoWorld.xz-caveCut.xy;vec2 cl=vec2(cp.x*cos(caveCut.z)-cp.y*sin(caveCut.z),cp.x*sin(caveCut.z)+cp.y*cos(caveCut.z));
if(abs(cl.x)<4.&&cl.y>=0.&&cl.y<=14.)discard;
if(cf.r<.47)discard;
float cover=cf.b*255.;
float nearView=1.-smoothstep(130.,1000.,distance(cameraPosition,vGeoWorld));
float broad=softnoise(vGeoWorld.xz*.018),grainFade=1.-smoothstep(.12,.65,max(length(dFdx(vGeoWorld.xz)),length(dFdy(vGeoWorld.xz)))),fine=mix(.5,softnoise(vGeoWorld.xz*3.1),grainFade);
vec3 base=diffuseColor.rgb;
vec3 materialGrain=hasGrain>.5?texture2D(groundGrain,vGeoWorld.xz*.38).rgb:base;
vec3 detail=mix(base*mix(.78,1.16,broad),materialGrain*mix(.65,.93,broad),hasGrain*.6);
if(cover>24.&&cover<44.)detail=mix(vec3(.49,.43,.31),vec3(.63,.57,.44),broad);
else if(cover>53.&&cover<77.)detail=mix(vec3(.22,.24,.22),vec3(.39,.38,.32),broad);
else if(cover>80.&&cover<145.)detail=mix(materialGrain*vec3(.8,.94,.66),vec3(.10,.16,.055),.55);
else if(cover>175.&&cover<208.)detail=mix(materialGrain*vec3(.86,.85,.71),vec3(.19,.20,.15),.38);
diffuseColor.rgb=mix(base,detail,nearView*.76)*mix(.94,1.035,fine*nearView);
`);
 };
 material.customProgramCacheKey=()=> 'geographic-terrain-v1';
 const tiles=[],group=new THREE.Group();scene.add(group);group.name='Real DEM terrain tiles';
 const size=1600;
 function build(x,z,w,d,step){
  const nx=Math.ceil(w/step),nz=Math.ceil(d/step),pos=[],uv=[],indices=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const xx=x+i*w/nx,zz=z+j*d/nz;pos.push(xx,sample(meta,surface,xx,zz),zz);uv.push((xx-bounds.x0)/bounds.width,1-(zz-bounds.z0)/bounds.depth);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;indices.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
 }
 for(let z=meta.z0;z<meta.z0+meta.depth;z+=size)for(let x=meta.x0;x<meta.x0+meta.width;x+=size){
  const w=Math.min(size,meta.x0+meta.width-x),d=Math.min(size,meta.z0+meta.depth-z);
  let hasLand=false;
  outer:for(let j=0;j<=d;j+=40)for(let i=0;i<=w;i+=40){const ix=Math.round((x+i-meta.x0)/40),iz=Math.round((z+j-meta.z0)/40);if(land[iz*meta.nx+ix]){hasLand=true;break outer;}}
  if(!hasLand)continue;
  const mesh=new THREE.Mesh(build(x,z,w,d,80),material);mesh.receiveShadow=true;group.add(mesh);tiles.push({mesh,x,z,w,d,step:80});
 }
 let frame=0;
 return {height,sourceHeight,collisionHeight:(x,z)=>Math.hypot(x-well.x,z-well.z)<102||Math.hypot(x-cave.x,z-cave.z)<16?height(x,z):Math.max(height(x,z),triangleHeight(x,z,80),triangleHeight(x,z,160)),tiles,material,group,inside:(x,z)=>geo.coastlines.some(p=>inside(x,z,p)),update(camera,quality){
  if(++frame%24)return;
  const limit=quality==='high'?4200:quality==='medium'?2200:0;
  let changed=0;
  for(const t of tiles){const distance=Math.hypot(camera.position.x-t.x-t.w/2,camera.position.z-t.z-t.d/2,camera.position.y);const step=distance<limit?40:quality==='low'?160:80;
   if(step!==t.step&&changed++<3){const old=t.mesh.geometry;t.mesh.geometry=build(t.x,t.z,t.w,t.d,step);old.dispose();t.step=step;}
  }
 },setGrain(texture){uniforms.groundGrain.value=texture;uniforms.hasGrain.value=texture?1:0;}};
}
