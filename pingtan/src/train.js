import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {inside} from './geo.js';

// Verified 2024 report: red electric sightseeing train, ~800 m, 3 stops.
// The alignment below is explicitly illustrative INSIDE the mapped beach;
// no surveyed track or restaurant endpoint coordinates were available.
export function makeTrainRoute(beach){
 const points=[];
 for(let z=2600;z>=1700;z-=10){const xs=[];for(let i=1;i<beach.points.length;i++){const a=beach.points[i-1],b=beach.points[i];if((a[1]>z)!==(b[1]>z))xs.push(a[0]+(z-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((a,b)=>a-b);if(xs.length<2)continue;const x=xs[0]+Math.min(38,(xs[1]-xs[0])*.25);if(inside(x,z,beach.points))points.push(new THREE.Vector3(x,0,z));}
 if(points.length<3)throw Error('Cannot place illustrative train within mapped Longwangtou beach.');
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+points[i].distanceTo(points[i-1]));
 let end=cumulative.findIndex(v=>v>=800);if(end<0)end=points.length-1;
 const t=(800-cumulative[end-1])/(cumulative[end]-cumulative[end-1]);points[end].lerpVectors(points[end-1],points[end],Math.min(1,t));points.length=end+1;
 const total=points.slice(1).reduce((s,p,i)=>s+p.distanceTo(points[i]),0);
 function at(distance){let d=THREE.MathUtils.clamp(distance,0,total);let i=1,acc=0;for(;i<points.length-1;i++){const l=points[i].distanceTo(points[i-1]);if(acc+l>=d)break;acc+=l;}return points[i-1].clone().lerp(points[i],(d-acc)/points[i].distanceTo(points[i-1]));}
 return {points,total,at,classification:'reference-based illustrative alignment, NOT measured route',source:'https://www.mnw.cn/news/pingtan/2953036.html'};
}
function meshBox(group,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
export function createTrain(scene,data,ground){
 const beach=data.geo.areas.find(a=>a.id==='w390385570'),route=makeTrainRoute(beach),group=new THREE.Group();group.name='龙王头红色观光小火车 · 轨迹与尺寸示意';scene.add(group);
 const red=new THREE.MeshStandardMaterial({color:0x8f2421,roughness:.57,metalness:.13}),cream=new THREE.MeshStandardMaterial({color:0xc3ac72,roughness:.58,metalness:.22}),black=new THREE.MeshStandardMaterial({color:0x222727,roughness:.78}),glass=new THREE.MeshStandardMaterial({color:0x284349,roughness:.27,metalness:.15}),steel=new THREE.MeshStandardMaterial({color:0x79796f,roughness:.65,metalness:.68});
 const parts=[],bedParts=[];
 // Rails embedded in sand, estimated 1.1m gauge, not a mainline railway.
 for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;const verts=[];for(const p of [a,b])for(const side of [-1,1]){const x=p.x-dz/l*1.65*side,z=p.z+dx/l*1.65*side;verts.push(x,Math.max(.055,ground.collisionHeight(x,z))+.43,z);}const bed=new THREE.BufferGeometry();bed.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));bed.setIndex([0,2,1,1,2,3]);bed.computeVertexNormals();bedParts.push(bed);for(const side of [-1,1]){const x=mx-dz/l*.55*side,z=mz+dx/l*.55*side,g=new THREE.BoxGeometry(l,.06,.075);g.rotateY(angle);g.translate(x,Math.max(.055,ground.collisionHeight(x,z))+.5,z);parts.push(g);}}
 const rails=new THREE.Mesh(mergeGeometries(parts),steel);parts.forEach(g=>g.dispose());rails.receiveShadow=true;group.add(rails);
 const paving=new THREE.Mesh(mergeGeometries(bedParts),new THREE.MeshStandardMaterial({color:0x746c5e,roughness:.95,side:THREE.DoubleSide}));bedParts.forEach(g=>g.dispose());paving.receiveShadow=true;group.add(paving);
 const cars=[];
 // The actual report photograph shows ONE open double-deck tram-style vehicle,
 // with white railings and a cream belt, rather than a steam engine/carriages.
 const car=new THREE.Group();car.name='Photo-reference red double-deck electric sightseeing vehicle';
 function roundedBody(y,h,material){const s=new THREE.Shape();s.moveTo(-1.1,2.7);s.lineTo(1.1,2.7);s.lineTo(1.1,-2.1);s.absarc(0,-2.1,1.1,0,-Math.PI,true);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:24});g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,material);m.position.y=y;m.castShadow=true;car.add(m);}
 roundedBody(.48,.94,red);roundedBody(2.93,.25,red);roundedBody(3.17,.32,cream);roundedBody(3.49,.21,red);
 const white=new THREE.MeshStandardMaterial({color:0xc8cdc7,roughness:.56,metalness:.25}),bars=[];
 function pipe(a,b,r=.026){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r,r,from.distanceTo(to),10);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray());bars.push(g);}
 for(const side of [-1,1]){
  pipe([side*1.1,4.5,-2.65],[side*1.1,4.5,2.1]);pipe([side*1.1,4.05,-2.65],[side*1.1,4.05,2.1]);
  for(let z=-2.65;z<2.2;z+=.48){pipe([side*1.1,3.69,z],[side*1.1,4.5,z]);pipe([side*1.1,1.4,z],[side*1.1,2.94,z],.038);}
  for(const y of [1.45,1.85,2.92])pipe([side*1.1,y,-2.65],[side*1.1,y,2.1]);
 }
 for(const z of [-2.65,2.7])for(const y of [4.05,4.5])pipe([-1.05,y,z],[1.05,y,z]);
 for(let x=-1.05;x<1.1;x+=.35)for(const z of [-2.65,2.7])pipe([x,3.7,z],[x,4.5,z]);
 const frontGlass=new THREE.Mesh(new THREE.CylinderGeometry(1.06,1.06,1.03,32,1,true,-Math.PI/2,Math.PI),glass);frontGlass.position.set(0,2.18,2.1);car.add(frontGlass);
 for(let a=-Math.PI/2;a<=Math.PI/2+.01;a+=Math.PI/6){const x=Math.sin(a)*1.1,z=2.1+Math.cos(a)*1.1;pipe([x,1.5,z],[x,2.93,z],.034);}
 for(const y of [.24,.53])pipe([-1.12,y,3.25],[1.12,y,3.25],.035);for(let x=-1.12;x<1.13;x+=.37)pipe([x,.15,3.3],[x,.63,3.2],.034);
 const frame=new THREE.Mesh(mergeGeometries(bars),white);bars.forEach(g=>g.dispose());frame.castShadow=true;car.add(frame);
 for(const side of [-1,1])for(const z of [-1.8,1.75]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.16,24),black);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.95,.32,z);car.add(wheel);}
 for(const y of [1.18,3.8])for(const z of [-2,-.9,.2,1.25]){meshBox(car,1.7,.13,.52,0,y,z,red);meshBox(car,1.7,.5,.09,0,y+.25,z-.22,red);}
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(.095,18,12),cream);lamp.position.set(0,1.03,3.23);car.add(lamp);meshBox(car,2.2,.06,.045,0,.54,3.2,new THREE.MeshStandardMaterial({color:0x387da5,roughness:.7}));
 group.add(car);cars.push(car);
 const stations=[0,route.total/2,route.total].map(d=>{const p=route.at(d),stop=new THREE.Group();stop.position.set(p.x-3,Math.max(.055,ground.height(p.x-3,p.z))+.26,p.z);meshBox(stop,.07,1.9,.07,0,.95,0,steel);meshBox(stop,.72,.5,.08,0,1.75,0,red);group.add(stop);return stop;});
 const focus=route.at(400);let travelled=400;
 function update(time,camera,quality){const distance=Math.hypot(camera.position.x-focus.x,camera.position.z-focus.z);group.visible=distance<(quality==='low'?1800:3500)&&camera.position.y<1800;if(!group.visible)return;const cycle=route.total*2,phase=(400+time*2.2)%cycle,forward=phase<route.total;travelled=forward?phase:cycle-phase;
  cars.forEach(car=>{const p=route.at(travelled),ahead=route.at(Math.min(route.total,travelled+2)),behind=route.at(Math.max(0,travelled-2)),heading=Math.atan2(ahead.x-behind.x,ahead.z-behind.z);car.position.set(p.x,Math.max(.055,ground.collisionHeight(p.x,p.z))+.49,p.z);car.rotation.y=heading;car.traverse(o=>{if(o.isMesh)o.castShadow=quality==='high';});});
 }
 return {group,route,cars,stations,focus,get travelled(){return travelled;},update};
}
