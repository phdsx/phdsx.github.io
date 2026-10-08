import * as THREE from 'three';
import {inside} from './geo.js';
import {batchGroup} from './architecture.js';

export function rng(seed=23){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const temp=new THREE.Object3D(),tintColor=new THREE.Color();
// Smooth colour/species patches are artistic inference, never elevation noise.
function patch(x,z,scale,seed=0){
 const u=x/scale,v=z/scale,ix=Math.floor(u),iz=Math.floor(v);
 const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+seed*79.3)*43758.5453;return n-Math.floor(n);};
 const smooth=t=>t*t*(3-2*t),a=smooth(u-ix),b=smooth(v-iz);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),a),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),a),b);
}

function leafTexture(seed,pine=false){const r=rng(seed),c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');ctx.strokeStyle='#6f6655';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(40,230);ctx.quadraticCurveTo(125,140,184,36);ctx.stroke();for(let i=0;i<(pine?150:58);i++){const x=32+r()*186,y=25+r()*207,s=(.65+r()*.35);ctx.fillStyle=`rgb(${Math.floor(190*s)},${Math.floor(195*s)},${Math.floor(164*s)})`;ctx.beginPath();ctx.ellipse(x,y,pine?1.3:8+r()*6,pine?14:5+r()*4,r()*Math.PI,0,Math.PI*2);ctx.fill();if(!pine){ctx.strokeStyle='#c7c3a2';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+7,y);ctx.stroke();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}

function treePrototype(seed,color,pine,bark){const rand=rng(seed),root=new THREE.Group();const leaf=new THREE.MeshStandardMaterial({map:leafTexture(seed,pine),color,side:THREE.DoubleSide,alphaTest:.43,roughness:.95});leaf.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight += diffuseColor.rgb * 0.085;\n#include <opaque_fragment>');};const trunk=bark.clone();trunk.color.set(0x8c8674);
 const addBranch=(a,b,ra,rb)=>{const dir=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(rb,ra,dir.length(),6,1),trunk);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());root.add(m);};
 addBranch(new THREE.Vector3(),new THREE.Vector3(.15,6.8,0),pine?.23:.19,.055);
 for(let i=0;i<40;i++){const a=i*2.399+rand()*.4,y=1.2+rand()*5.3,rad=pine?(7-y)*.48+.4:1.5+rand()*2.2;const p=new THREE.Vector3(.05,y,0),q=new THREE.Vector3(Math.cos(a)*rad,y+.4+rand(),Math.sin(a)*rad);addBranch(p,q,.045,.011);if(!pine){const e=q.clone().add(new THREE.Vector3((rand()-.5)*1.4,.5,(rand()-.5)*1.4));addBranch(q,e,.015,.003);}}
 const p=[],n=[],uv=[],idx=[];const q=new THREE.Quaternion(),rot=new THREE.Euler(),v=new THREE.Vector3(),normal=new THREE.Vector3();for(let i=0;i<(pine?740:1050);i++){let x,y,z;if(pine){y=1.9+rand()*5.7;const a=rand()*Math.PI*2,r=(8-y)*.49*Math.sqrt(rand());x=Math.cos(a)*r;z=Math.sin(a)*r;}else{const az=rand()*Math.PI*2,zz=rand()*2-1,rr=Math.cbrt(rand());const radius=(3.25+.6*Math.sin(az*5))*rr;const u=Math.sqrt(1-zz*zz);x=Math.cos(az)*u*radius;y=4.7+zz*2.7*rr;z=Math.sin(az)*u*radius;}
  const s=pine?.8:.62+rand()*.45;rot.set(rand()*Math.PI,rand()*Math.PI,rand()*Math.PI);q.setFromEuler(rot);normal.set(0,0,1).applyQuaternion(q);const base=p.length/3;for(const [a,b] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]){v.set(a*s,b*s,0).applyQuaternion(q);p.push(x+v.x,y+v.y,z+v.z);n.push(normal.x,normal.y,normal.z);uv.push(a+.5,b+.5);}idx.push(base,base+1,base+2,base+1,base+3,base+2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);root.add(new THREE.Mesh(g,leaf));return batchGroup(root);}

export class Forest{
 constructor(geo,scene,renderer,bark){this.geo=geo;this.scene=scene;this.renderer=renderer;this.bark=bark;this.types=[];this.cells=[];this.last=new THREE.Vector3(1e9,0,0);this.nearRange=58;this.nearBudget=112;this.count=0;this.revision=0;this.nearMeshes=[];this.targets=[];}
 async init(progress){const colors=[0xac7655,0xb86643,0xb49b5c,0x98a272,0x768966,0x607758];
  for(let i=0;i<colors.length;i++){const proto=treePrototype(120+i*81,colors[i],i===5,this.bark);const baking=new THREE.Scene();baking.add(new THREE.HemisphereLight(0xdfe6ec,0x91866c,3));const sun=new THREE.DirectionalLight(0xffe8c5,2.4);sun.position.set(-8,15,9);baking.add(sun);baking.add(proto);const cam=new THREE.OrthographicCamera(-5,5,5, -5,.1,80);cam.position.set(9,8.2,20);cam.lookAt(0,4,0);const target=new THREE.WebGLRenderTarget(512,512,{format:THREE.RGBAFormat,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});const oldColor=new THREE.Color();this.renderer.getClearColor(oldColor);const oldAlpha=this.renderer.getClearAlpha();this.renderer.setClearColor(0x000000,0);this.renderer.setRenderTarget(target);this.renderer.clear();this.renderer.render(baking,cam);this.renderer.setRenderTarget(null);this.renderer.setClearColor(oldColor,oldAlpha);this.targets.push(target);baking.remove(proto);
   const mat=new THREE.MeshBasicMaterial({map:target.texture,alphaTest:.25,side:THREE.DoubleSide,color:0xffffff});mat.color.setRGB(3.2,3.2,3.2);mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float billboardScale = length(instanceMatrix[0].xyz); mvPosition.xyz += vec3(transformed.xy * billboardScale, 0.0); gl_Position = projectionMatrix * mvPosition;`);};this.types.push({proto,mat});progress(45+i*4);await new Promise(r=>setTimeout(r,0));
  }
  const random=rng(99321),cellMap=new Map();const add=(x,z,scale,type)=>{if(this.geo.exclusion(x,z,2.8))return;const y=this.geo.height(x,z),size=inside(x,z,this.geo.data.park.points)?180:800;const key=size+':'+Math.floor(x/size)+','+Math.floor(z/size);if(!cellMap.has(key))cellMap.set(key,{x:(Math.floor(x/size)+.5)*size,z:(Math.floor(z/size)+.5)*size,trees:[],meshes:[]});cellMap.get(key).trees.push({x,y,z,scale,type,rotation:random()*Math.PI*2,width:.80+random()*.37,flip:random()<.5?1:0,tint:.88+random()*.19});this.count++;};
  // Density, species and individual locations are explicitly inferred; terrain is not.
  const chooseType=(x,z,slope)=>{
   const conifers=.12+.58*patch(x,z,175,4)+Math.min(.12,slope*.1);
   if(random()<conifers)return 5;
   const autumn=patch(x,z,110,9)*.80+random()*.20;
   return autumn<.30?0:autumn<.45?1:autumn<.61?2:autumn<.76?3:4;
  };
  for(let i=0;i<150000;i++){
   const x=-1000+random()*2050,z=-850+random()*1620;
   if(!inside(x,z,this.geo.data.park.points))continue;
   const slope=Math.hypot(this.geo.raw(x+10,z)-this.geo.raw(x-10,z),this.geo.raw(x,z+10)-this.geo.raw(x,z-10))/20;
   const density=.38+.42*patch(x,z,95,2);
   if(random()>density||(slope>.95&&random()>.45))continue;
   const type=chooseType(x,z,slope);
   add(x,z,(type===5?1.05:.72)+random()*(type===5?.68:.51),type);
  }
  for(let i=0;i<24000;i++){
   const x=-4600+random()*7000,z=-3400+random()*7300;
   if(inside(x,z,this.geo.data.park.points)||x>1250||this.geo.raw(x,z)<150)continue;
   add(x,z,.75+random()*.8,chooseType(x,z,.3));
  }
  // Two courtyard trees are photo-guided approximations, not surveyed single-tree positions.
  for(const u of [-11.6,11.6]){const a=this.geo.hallAngle,x=this.geo.hall.x+Math.cos(a)*u+Math.sin(a)*16,z=this.geo.hall.z-Math.sin(a)*u+Math.cos(a)*16,cx=(Math.floor(x/180)+.5)*180,cz=(Math.floor(z/180)+.5)*180,key='180:'+Math.floor(x/180)+','+Math.floor(z/180);if(!cellMap.has(key))cellMap.set(key,{x:cx,z:cz,trees:[],meshes:[]});cellMap.get(key).trees.push({x,y:this.geo.height(x,z),z,scale:1.6,type:u<0?2:3,rotation:.7,width:1,flip:0,tint:1});this.count++;}
  const base=new THREE.PlaneGeometry(10,10);base.translate(0,4.1,0);
  // Camera-facing impostors avoid crossed trunks and retain a full canopy from above.
  const merged=base;
  // One foliage atlas and one draw per spatial cell instead of six material draws.
  const pixels=new Uint8Array(1536*1024*4);for(let i=0;i<6;i++){const tile=new Uint8Array(512*512*4);this.renderer.readRenderTargetPixels(this.targets[i],0,0,512,512,tile);const ox=(i%3)*512,oy=Math.floor(i/3)*512;for(let y=0;y<512;y++)pixels.set(tile.subarray(y*512*4,(y+1)*512*4),((oy+y)*1536+ox)*4);}
  const atlas=new THREE.DataTexture(pixels,1536,1024,THREE.RGBAFormat);atlas.generateMipmaps=true;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.magFilter=THREE.LinearFilter;atlas.needsUpdate=true;
  const atlasMat=new THREE.MeshBasicMaterial({map:atlas,alphaTest:.25,side:THREE.DoubleSide});atlasMat.color.setRGB(2.0,2.0,2.0);atlasMat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 atlasOffset; attribute float atlasFlip; varying vec2 vAtlas; varying float vFlip;').replace('#include <project_vertex>',`vAtlas = atlasOffset; vFlip=atlasFlip; vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0); vec2 billboardScale=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz)); mvPosition.xyz += vec3(transformed.xy*billboardScale,0.0); gl_Position=projectionMatrix*mvPosition;`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vAtlas; varying float vFlip;').replace('#include <map_fragment>','vec4 sampledDiffuseColor=texture2D(map,vec2(mix(vMapUv.x,1.0-vMapUv.x,vFlip),vMapUv.y)/vec2(3.0,2.0)+vAtlas); diffuseColor *= sampledDiffuseColor;');};
  for(const c of cellMap.values()){const ts=c.trees,geometry=merged.clone(),offsets=new Float32Array(ts.length*2),flips=new Float32Array(ts.length);ts.forEach((t,i)=>{flips[i]=t.flip;offsets[i*2]=(t.type%3)/3;offsets[i*2+1]=Math.floor(t.type/3)/2;});geometry.setAttribute('atlasOffset',new THREE.InstancedBufferAttribute(offsets,2));geometry.setAttribute('atlasFlip',new THREE.InstancedBufferAttribute(flips,1));const m=new THREE.InstancedMesh(geometry,atlasMat,ts.length);m.position.set(c.x,0,c.z);m.userData.trees=ts;ts.forEach((t,i)=>{temp.position.set(t.x-c.x,t.y,t.z-c.z);temp.rotation.set(0,t.rotation,0);temp.scale.set(t.scale*t.width,t.scale,t.scale*t.width);temp.updateMatrix();m.setMatrixAt(i,temp.matrix);m.setColorAt(i,tintColor.setRGB(t.tint,t.tint,t.tint));});m.computeBoundingSphere();c.meshes.push(m);this.scene.add(m);this.cells.push(c);}
  for(let type=0;type<this.types.length;type++){const meshes=[];for(const source of this.types[type].proto.children){const m=new THREE.InstancedMesh(source.geometry,source.material,112);m.count=0;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=true;this.scene.add(m);meshes.push(m);}this.nearMeshes.push(meshes);}progress(83);
 }
 update(camera,force=false){if(!force&&camera.position.distanceToSquared(this.last)<16)return;this.last.copy(camera.position);this.revision++;const candidates=[];for(const c of this.cells){const distance=Math.hypot(camera.position.x-c.x,camera.position.z-c.z);for(const m of c.meshes)m.visible=distance<4100;if(distance<230)for(const t of c.trees){const d=Math.hypot(camera.position.x-t.x,camera.position.z-t.z,camera.position.y-(t.y+4));if(d<this.nearRange)candidates.push({t,d});}}
  candidates.sort((a,b)=>a.d-b.d);const selected=new Set(candidates.slice(0,this.nearBudget).map(o=>o.t));const by=this.types.map(()=>[]);for(const t of selected)by[t.type].push(t);
  for(const c of this.cells){if(Math.hypot(camera.position.x-c.x,camera.position.z-c.z)>400&&!c.hadNear)continue;c.hadNear=false;for(const m of c.meshes){m.userData.trees.forEach((t,i)=>{const hide=selected.has(t);if(hide)c.hadNear=true;temp.position.set(t.x-c.x,t.y,t.z-c.z);temp.rotation.set(0,t.rotation,0);temp.scale.set(hide?0:t.scale*t.width,hide?0:t.scale,hide?0:t.scale*t.width);temp.updateMatrix();m.setMatrixAt(i,temp.matrix);});m.instanceMatrix.needsUpdate=true;}}
  by.forEach((ts,type)=>{for(const m of this.nearMeshes[type]){m.count=ts.length;ts.forEach((t,i)=>{temp.position.set(t.x,t.y,t.z);temp.rotation.set(0,t.rotation,0);temp.scale.set(t.scale*t.width,t.scale,t.scale*t.width);temp.updateMatrix();m.setMatrixAt(i,temp.matrix);m.setColorAt(i,tintColor.setRGB(t.tint,t.tint,t.tint));});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();}});
 }
}
