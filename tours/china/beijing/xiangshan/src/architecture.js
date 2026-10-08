import * as THREE from 'three';
import {buildCourtyard} from './courtyard.js';

// All vertical dimensions and fine structure below are photographic approximations.
// Only the hall's horizontal footprint and orientation are constrained by OSM.
export function batchGroup(group){group.updateMatrixWorld(true);const by=new Map();group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const key=o.material.uuid;if(!by.has(key))by.set(key,{mat:o.material,items:[]});let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();by.get(key).items.push(g);});const result=new THREE.Group();for(const {mat,items} of by.values()){const out=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const size=name==='uv'?2:3;const n=items.reduce((sum,g)=>sum+g.attributes.position.count,0);const a=new Float32Array(n*size);let k=0;for(const g of items){const att=g.getAttribute(name);if(att)a.set(att.array,k);k+=g.attributes.position.count*size;}out.setAttribute(name,new THREE.BufferAttribute(a,size));}const m=new THREE.Mesh(out,mat);m.castShadow=true;m.receiveShadow=true;out.computeBoundingSphere();result.add(m);for(const g of items)g.dispose();}return result;}

function textureCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

export function buildHall(geo,materials){
 const raw=new THREE.Group(),world=new THREE.Group();raw.position.set(geo.hall.x,geo.hallBase,geo.hall.z);raw.rotation.y=geo.hallAngle;
 const red=new THREE.MeshStandardMaterial({color:0x84382d,roughness:.88}),dark=new THREE.MeshStandardMaterial({color:0x28332c,roughness:.9}),gold=new THREE.MeshStandardMaterial({color:0xb59958,roughness:.73,metalness:.08}),stone=new THREE.MeshStandardMaterial({color:0xb0b2a7,roughness:.94,normalMap:materials.rock.normalMap,normalScale:new THREE.Vector2(.07,.07)});const roof=materials.roof;
 stone.onBeforeCompile=shader=>{
  shader.uniforms.stoneBase={value:geo.hallBase};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStonePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStonePosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStonePosition; uniform float stoneBase;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(vStonePosition*63.0),vec3(12.9898,78.233,41.29)))*43758.5453);
   float age=1.0-smoothstep(stoneBase-1.6,stoneBase+.4,vStonePosition.y);
   diffuseColor.rgb *= mix(vec3(.91,.92,.86),vec3(1.0),grain)*mix(vec3(1.0),vec3(.73,.77,.65),age*.40);`);
 };

 const box=(w,h,d,x,y,z,m=red,parent=raw)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const cylinder=(r1,r2,h,x,y,z,m=red)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,12),m);mesh.position.set(x,y,z);raw.add(mesh);return mesh;};
 const width=26.88,depth=21.27,bodyW=23.7,bodyD=16;
 box(width,.72,depth,0,.36,0,stone);box(bodyW,4.9,bodyD,0,3.17,0,dark);
 for(const side of [-1,1]){box(.48,4.8,bodyD,side*bodyW/2,3.1,0,red);box(bodyW,.5,.45,0,5.55,side*9.15,red);box(bodyW,.2,.55,0,5.22,side*9.15,gold);}
 const doorTexture=textureCanvas(256,512,(c,w,h)=>{c.fillStyle='#622921';c.fillRect(0,0,w,h);c.fillStyle='#202822';c.fillRect(15,16,w-30,h*.60);c.strokeStyle='#a48449';c.lineWidth=3;for(let y=-w;y<h*.69;y+=23){c.beginPath();c.moveTo(16,y);c.lineTo(w-16,y+w-32);c.stroke();c.beginPath();c.moveTo(w-16,y);c.lineTo(16,y+w-32);c.stroke();}c.fillStyle='#713027';c.fillRect(0,330,w,182);c.strokeStyle='#c3a365';c.lineWidth=5;c.strokeRect(13,12,w-26,h-24);c.strokeRect(26,350,w-52,140);c.beginPath();c.ellipse(w/2,420,60,37,0,0,Math.PI*2);c.stroke();});
 const doors=new THREE.MeshStandardMaterial({map:doorTexture,roughness:.83});
 for(let bay=0;bay<7;bay++){const x=(bay-3)*3.25;for(let leaf=-1;leaf<=1;leaf++){if(bay===3&&leaf===0)continue;const dm=new THREE.Mesh(new THREE.PlaneGeometry(.98,4.1),doors);dm.position.set(x+leaf*1.01,2.83,8.06);raw.add(dm);}for(const z of [-8.3,9.15]){cylinder(.18,.23,4.7,x-1.58,3.13,z);cylinder(.30,.31,.31,x-1.58,.87,z,stone);box(.45,.32,.55,x-1.58,5.14,z,gold);}}

 const latticeMat=new THREE.MeshStandardMaterial({color:0xa77845,roughness:.9});
 const latticeBeam=(x0,y0,x1,y1)=>{const length=Math.hypot(x1-x0,y1-y0);const m=box(length,.023,.035,(x0+x1)/2,(y0+y1)/2,8.094,latticeMat);m.rotation.z=Math.atan2(y1-y0,x1-x0);};
 for(let bay=0;bay<7;bay++)for(let leaf=-1;leaf<=1;leaf++){
  if(bay===3&&leaf===0)continue;
  const cx=(bay-3)*3.25+leaf*1.01,left=cx-.405,right=cx+.405,bottom=2.52,top=4.68;
  for(const direction of [-1,1])for(let k=-5;k<=16;k++){
   const intercept=bottom+k*.19;
   const pts=[];
   for(const x of [left,right]){const y=intercept+direction*(x-left);if(y>=bottom&&y<=top)pts.push([x,y]);}
   for(const y of [bottom,top]){const x=left+(y-intercept)/direction;if(x>=left&&x<=right)pts.push([x,y]);}
   if(pts.length>=2)latticeBeam(...pts[0],...pts[1]);
  }
  for(const x of [cx-.475,cx+.475])box(.045,4.12,.07,x,2.83,8.12,red);
  box(.98,.07,.07,cx,2.46,8.12,red);
 }
 cylinder(.18,.23,4.7,11.33,3.13,9.15);cylinder(.3,.31,.31,11.33,.87,9.15,stone);
 // Painted eaves: geometric motifs are schematic, not tracings of protected artwork.
 const beamtex=textureCanvas(1024,128,(c,w,h)=>{c.fillStyle='#273f42';c.fillRect(0,0,w,h);c.strokeStyle='#ab9861';c.lineWidth=4;for(let x=0;x<w;x+=128){c.strokeRect(x+5,9,118,110);c.beginPath();c.ellipse(x+64,64,49,37,0,0,Math.PI*2);c.stroke();c.strokeStyle='#578487';for(let k=0;k<3;k++)c.strokeRect(x+15+k*7,23+k*7,98-k*14,82-k*14);c.strokeStyle='#ab9861';}});
 const beamMat=new THREE.MeshStandardMaterial({map:beamtex,roughness:.87});box(24,.8,.42,0,5.23,9.26,beamMat);
 for(let x=-11.5;x<=11.5;x+=.66){box(.10,.15,1.4,x,5.76,9.4,dark);box(.22,.11,.75,x,5.54,9.50,gold);}
 const positions=[],uvs=[],indices=[];const rows=28,cols=92;
 function roofSide(sign){let base=positions.length/3;for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=cols;i++){const u=i/cols*2-1,x=u*(width*.36+(width*.5-width*.36)*t),z=sign*depth*.5*t,y=9.2-4.7*t+1.1*t*t+.65*Math.pow(Math.abs(u),7)*Math.pow(t,4);positions.push(x,y,z);uvs.push((x+width/2)/2,t*depth/3);}}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=base+j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;if(sign===1)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);}}
 roofSide(1);roofSide(-1);
 for(const sign of [-1,1]){const base=positions.length/3;const n=28;for(let j=0;j<=n;j++){const t=j/n;for(let i=0;i<=n;i++){const s=i/n*2-1;positions.push(sign*(width*.36+(width*.5-width*.36)*t),9.2-4.7*t+1.1*t*t+.65*Math.pow(t,4),s*depth*.5*t);uvs.push(i/n*5,j/n*3);}}for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=base+j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}}
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));rg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));rg.setIndex(indices);rg.computeVertexNormals();const roofMesh=new THREE.Mesh(rg,roof);roofMesh.material.side=THREE.DoubleSide;raw.add(roofMesh);
 // Separate tile rolls along both slopes maintain readable roof detail at close range.
 const tilemat=new THREE.MeshStandardMaterial({color:0x66665b,roughness:.9});for(const sign of [-1,1]){for(let x=-12.5;x<=12.5;x+=.31){const pts=[];for(let j=0;j<=12;j++){const t=j/12;const maxX=width*.36+(width*.5-width*.36)*t;if(Math.abs(x)>maxX)continue;pts.push(new THREE.Vector3(x,9.24-4.7*t+1.1*t*t+.65*Math.pow(Math.abs(x)/maxX,7)*t**4,sign*depth*.5*t));}if(pts.length>1)raw.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.055,4,false),tilemat));}}
 box(width*.74,.25,.3,0,9.23,0,tilemat);for(const s of [-1,1]){cylinder(.12,.25,.8,s*width*.37,9.55,0,tilemat);box(.24,.18,.5,s*width*.37,9.85,0,tilemat);}
 const plaqueTex=textureCanvas(256,512,(c,w,h)=>{c.fillStyle='#16302f';c.fillRect(0,0,w,h);c.strokeStyle='#b7a168';c.lineWidth=8;c.strokeRect(10,10,w-20,h-20);c.fillStyle='#d5bb7b';c.font='bold 84px serif';c.textAlign='center';['勤','政','殿'].forEach((t,i)=>c.fillText(t,w/2,133+i*130));});
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.82,1.6),new THREE.MeshStandardMaterial({map:plaqueTex,roughness:.8}));plaque.position.set(0,5.33,9.52);raw.add(plaque);
 // Reference-matched front steps, without claiming a measured riser count.
 for(const center of [-7,0,7])for(let i=0;i<10;i++){const top=-.75+(i+1)*.147;box(center===0?3.2:2.2,top+.95,.35,center,(top-.95)/2,14-i*.35,stone);}
 // The same courtyard profile is used by terrain, masonry and the walk controller.
 const paving=materials.stone.clone();paving.color.set(0xa9aaa0);paving.normalScale.set(.3,.3);
 buildCourtyard(raw,geo,stone,paving);
 world.add(batchGroup(raw));world.name='Qinzheng Hall — photographic approximation, unmeasured vertical dimensions';
 return {group:world,materials:{red,dark,gold,stone},raw};
}
