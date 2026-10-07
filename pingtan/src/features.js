import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {centre} from './geo.js';
export function createFeatures(scene,data,ground){
 const buckets=new Map(),bld=new Map(),main=data.geo.coastlines[data.geo.mainIsland];
 const push=(bucket,x,z,g)=>{const k=`${Math.floor(x/2400)},${Math.floor(z/2400)}`;if(!bucket.has(k))bucket.set(k,[]);bucket.get(k).push(g);};
 const widths={motorway:15,trunk:12,primary:10,secondary:8,tertiary:7,residential:5,service:3,unclassified:5,living_street:4,pedestrian:4,footway:1.8,path:1.2,steps:1.5,track:2.5};
 let roadCount=0;
 for(const r of data.geo.roads){
  const kind=r.tags.highway;if(!widths[kind])continue;
  const w=parseFloat(r.tags.width)||widths[kind],points=[],raw=r.points;
  for(let i=1;i<raw.length;i++){
   const a=raw[i-1],b=raw[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len>1800)continue;
   const n=Math.max(1,Math.ceil(len/35));for(let k=0;k<n;k++)points.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);
  }points.push(raw.at(-1));if(points.length<2)continue;
  const pos=[],colors=[],index=[],isPath=['footway','path','steps','track'].includes(kind),color=new THREE.Color(isPath?0x8c8b74:0x696c64),bridge=r.tags.bridge==='yes',lift=bridge?7:1.1;
  for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,dx=-(b[1]-a[1])/len*w/2,dz=(b[0]-a[0])/len*w/2,[x,z]=points[i];
   for(const s of [-1,1]){const xx=x+dx*s,zz=z+dz*s;pos.push(xx,ground.height(xx,zz)+lift,zz);colors.push(color.r,color.g,color.b);}
   if(i)index.push(i*2-2,i*2,i*2-1,i*2-1,i*2,i*2+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();const c=centre(raw);push(buckets,...c,g);roadCount++;
 }
 const special=new Set(['w611957434','w611957440']);
 for(const b of data.geo.buildings){
  if(special.has(b.id))continue;
  const x=b.x,z=b.z,p=b.points,shape=new THREE.Shape();shape.moveTo(p[0][0]-x,-p[0][1]+z);for(const v of p.slice(1))shape.lineTo(v[0]-x,-v[1]+z);
  const tagged=parseFloat(b.height),h=Number.isFinite(tagged)?tagged:(parseFloat(b.levels)||(['apartments','hotel'].includes(b.tags.building)?5:2))*3;
  const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(2,Math.min(150,h)),bevelEnabled:false,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(x,ground.height(x,z),z);
  const col=new THREE.Color(b.tags.building==='industrial'?0xa3a59c:0xb6b7a8),cs=new Float32Array(g.attributes.position.count*3);for(let i=0;i<cs.length;i+=3){cs[i]=col.r;cs[i+1]=col.g;cs[i+2]=col.b;}g.setAttribute('color',new THREE.BufferAttribute(cs,3));delete g.attributes.uv;push(bld,x,z,g);
 }
 const batches=[];
 function add(map,material,type){for(const [key,gs] of map){const geometry=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!geometry)continue;const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;scene.add(mesh);const [cx,cz]=key.split(',').map(v=>(+v+.5)*2400);batches.push({mesh,cx,cz,type});}}
 add(buckets,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),'road');
 add(bld,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88}),'building');
 return {batches,roadCount,update(camera,quality){const r=quality==='low'?4500:quality==='high'?12000:9000;for(const b of batches){b.mesh.visible=Math.hypot(camera.position.x-b.cx,camera.position.z-b.cz)<r&&camera.position.y<10000;b.mesh.castShadow=b.type==='building'&&camera.position.y<350&&Math.hypot(camera.position.x-b.cx,camera.position.z-b.cz)<2500;}}};
}
