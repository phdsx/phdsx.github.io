import * as THREE from 'three';
import { mergeGeometries,mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import {stonePost,stonePanel} from './balustrade.js';
import {ridgeEnd} from './ornaments.js';
const matrix=new THREE.Matrix4(), q=new THREE.Quaternion(), v=new THREE.Vector3();
export class Batch {
 constructor(materials){this.materials=materials;this.parts=new Map();}
 add(geometry,material,x=0,y=0,z=0,ry=0){geometry.applyMatrix4(matrix.compose(v.set(x,y,z),q.setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(1,1,1)));const a=this.parts.get(material)||[];a.push(geometry.toNonIndexed?geometry.index?geometry.toNonIndexed():geometry:geometry);if(geometry.index)geometry.dispose();this.parts.set(material,a);}
 box(w,h,d,x,y,z,mat,ry=0){if(w<=0||h<=0||d<=0)return;const geo=new THREE.BoxGeometry(w,h,d);const metres={wall:[4,4],red:[3,3],brick:[1.2,.48],stone:[2.4,1.6],pave:[2.4,2.4],blue:[12.8,h]};if(metres[mat]){const uv=geo.attributes.uv,faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]],[u,v]=metres[mat];for(let i=0;i<uv.count;i++){const f=faces[Math.floor(i/4)];uv.setXY(i,uv.getX(i)*f[0]/u,uv.getY(i)*f[1]/v);}}this.add(geo,mat,x,y,z,ry);}
 finish(){const g=new THREE.Group();for(const [key,parts] of this.parts){const geo=mergeGeometries(parts,false);const m=new THREE.Mesh(geo,this.materials[key]);m.castShadow=key!=='water';m.receiveShadow=true;g.add(m);for(const p of parts)p.dispose();}this.parts.clear();return g;}
}
export function polygon(points,holes=[],height=1){const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],-p[1])));for(const hole of holes)shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p[0],-p[1]))));const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});geo.rotateX(-Math.PI/2);return geo;}
export function inside(x,z,points){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,zi]=points[i],[xj,zj]=points[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;}
export function distanceToSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
// Curved sweep: every roof face has a rising eave and concave profile, rather than a flat pyramid.
export function roofGeometry(w,d,height,type='hip',steps=12){
 const positions=[],uv=[], ridge=type==='pyramid'?0:type==='gable'?w/2:type==='gable-skirt'?w*.4:type==='eave-skirt'?(w-3)*.41:type==='truncated'?w*.28:Math.max(0,w/2-d*.36);
 const rectTop=type==='truncated'?d*.23:type==='gable-skirt'?d*.25:type==='eave-skirt'?(d-3)*.325:0;
 function point(face,s,t){let x,z;if(face<2){const half=ridge+(w/2-ridge)*t;x=s*half;z=(rectTop+(d/2-rectTop)*t)*(face===0?1:-1);}else{x=(ridge+(w/2-ridge)*t)*(face===2?1:-1);z=s*(rectTop+(d/2-rectTop)*t);}
 const corner=(Math.abs(s)**8)*t**6;
 const y=height*(1-t)**1.65+Math.min(.65,height*.12)*corner;
 return [x,y,z];}
 const faces=type==='gable'?2:4;
 for(let f=0;f<faces;f++)for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
   const s=i/steps*2-1,S=(i+1)/steps*2-1,t=j/steps,T=(j+1)/steps;
   const ps=[point(f,s,t),point(f,S,t),point(f,S,T),point(f,s,T)];
   for(const k of (f===0||f===3?[0,2,1,0,3,2]:[0,1,2,0,2,3])){positions.push(...ps[k]);uv.push(f<2?(ps[k][0]+w/2)/1.6:(ps[k][2]+d/2)/1.6,f<2?(ps[k][2]+d/2)/1.6:(ps[k][0]+w/2)/1.6);}
 }
 if(type==='truncated'||type==='gable-skirt'){const pts=[[-ridge,height,-rectTop],[ridge,height,-rectTop],[ridge,height,rectTop],[-ridge,height,rectTop]];for(const k of [0,2,1,0,3,2]){positions.push(...pts[k]);uv.push(pts[k][0],pts[k][2]);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const smooth=mergeVertices(g,1e-5);smooth.computeVertexNormals();g.dispose();return smooth;
}
export function roof(batch,b,type='hip',double=false){
 const {x,z,w,d,h,base=0}=b, body=h*(double?.39:.55),upperY=base+(double?h*.66:body),crest=b.crestHeight||0,roofTop=base+h-crest,rise=roofTop-upperY;
 const yaw=b.yaw||0;
 const skin=(rw,rd,rh,kind,y,steps=b.id?16:8)=>{const geo=roofGeometry(rw,rd,rh,kind,steps);if(b.id||double)batch.add(geo.clone(),'soffit',x,y-.075,z,yaw);batch.add(geo,'tile',x,y,z,yaw);};
 if(double){skin(w+3,d+3,h*.16,'eave-skirt',base+body);batch.box(w*.82,h*.24,d*.65,x,base+body+h*.12,z,'window',yaw);
  // The inter-eave zone reads as a recessed structural band, not a solid green wall.
  for(const side of [-1,1]){const yy=upperY-h*.065,zz=side*d*.327,c=Math.cos(yaw),s=Math.sin(yaw);batch.box(w*.82,h*.085,.14,x+zz*s,yy,z+zz*c,'blue',yaw);batch.box(w*.84,.25,.26,x+zz*s,upperY-.15,z+zz*c,'paint',yaw);}
 }
 const roofW=double?w*.9+2:w+3,roofD=double?d*.88+2:d+3;
 if(type==='gablehip'){
   // A four-slope skirt meets the two-slope upper roof. Curved end gables follow
   // the same roof sweep, so no rectangular gable box intersects the tile surface.
   skin(roofW,roofD,rise*.4,'gable-skirt',upperY);
   skin(roofW*.8,roofD*.5,rise*.6,'gable',upperY+rise*.4);
   const pos=[],tex=[];for(const sign of [-1,1]){const curve=[];for(let i=0;i<=24;i++){const zz=(i/24*2-1)*roofD*.25,t=Math.abs(i/24*2-1),yy=rise*.6*(1-t)**1.65;curve.push([sign*roofW*.4,yy,zz]);}for(let i=1;i<curve.length;i++){const verts=[[sign*roofW*.4,0,0],curve[i-1],curve[i]];for(const p of (sign>0?verts:verts.toReversed())){pos.push(...p);tex.push(p[2],p[1]);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.computeVertexNormals();batch.add(g,'gable',x,upperY+rise*.4,z,yaw);
 }else skin(roofW,roofD,rise,type,upperY);
 if(type!=='pyramid'&&type!=='truncated'){const ridgeLength=type==='gable'||type==='gablehip'?roofW*(type==='gablehip'?.8:1):Math.max(1,roofW-roofD*.72);const ridge=new THREE.CylinderGeometry(.23,.23,ridgeLength,10);ridge.rotateZ(Math.PI/2);batch.add(ridge,'ridge',x,roofTop-.23,z,yaw);if(crest)for(const sign of [-1,1]){const end=ridgeEnd(crest);if(sign<0){end.scale(-1,1,1);const i=end.index;if(i)for(let j=0;j<i.count;j+=3){const a=i.getX(j);i.setX(j,i.getX(j+2));i.setX(j+2,a);}else{for(const attr of Object.values(end.attributes))for(let j=0;j<attr.count;j+=3)for(let k=0;k<attr.itemSize;k++){const a=attr.array[j*attr.itemSize+k];attr.array[j*attr.itemSize+k]=attr.array[(j+2)*attr.itemSize+k];attr.array[(j+2)*attr.itemSize+k]=a;}}end.computeVertexNormals();}batch.add(end,'ridge',x+Math.cos(yaw)*sign*ridgeLength/2,roofTop,z-Math.sin(yaw)*sign*ridgeLength/2,yaw);}}
 if(type==='pyramid'){const geo=new THREE.SphereGeometry(.65,10,8);geo.scale(1,1.4,1);batch.add(geo,'gold',x,base+h+.4,z);}
}
export function instances(geometry,material,transforms){const mesh=new THREE.InstancedMesh(geometry,material,transforms.length);const obj=new THREE.Object3D();transforms.forEach((t,i)=>{obj.position.set(t.x,t.y,t.z);obj.rotation.set(0,t.ry||0,t.rz||0);if(t.q)obj.quaternion.fromArray(t.q);obj.scale.set(t.sx||1,t.sy||1,t.sz||1);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();return mesh;}
export function railing(batch,x,z,w,d,y,openings=8){const posts=[],panels=[];for(let side=0;side<4;side++){const horizontal=side<2,len=horizontal?w:d,count=Math.max(2,Math.floor(len/2.7));for(let i=0;i<=count;i++){const a=-len/2+len*i/count;if(horizontal&&Math.abs(a)<openings)continue;posts.push({x:x+(horizontal?a:(side===2?-w/2:w/2)),y:y+.65,z:z+(horizontal?(side===0?-d/2:d/2):a)});if(i<count&&(!horizontal||Math.abs(a+len/count/2)>openings)){panels.push({x:x+(horizontal?a+len/count/2:(side===2?-w/2:w/2)),y:y+.5,z:z+(horizontal?(side===0?-d/2:d/2):a+len/count/2),sx:len/count,sy:.6,sz:.17,ry:horizontal?0:Math.PI/2});}}}
 const g=new THREE.Group();g.add(instances(stonePost(),batch.materials.stone,posts));g.add(instances(stonePanel(),batch.materials.stone,panels));return g;}
