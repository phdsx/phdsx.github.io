import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {inside,centre} from './geo.js';
import {random} from './materials.js';
const box=new THREE.BoxGeometry(1,1,1),obj=new THREE.Object3D();
function cuboid(w,h,d,x,y,z,material){let g=box,scaled=true;if(material.map){g=box.clone();g.scale(w,h,d);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/3,(ny>.5?p.getZ(i):p.getY(i))/3);}scaled=false;}const m=new THREE.Mesh(g,material);if(scaled)m.scale.set(w,h,d);m.position.set(x,y,z);return m;}
function shapedWall(b,height,material){const shape=new THREE.Shape(),p=b.points;shape.moveTo(p[0][0]-b.x,-p[0][1]+b.z);for(const v of p.slice(1))shape.lineTo(v[0]-b.x,-v[1]+b.z);const g=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++){const nx=Math.abs(g.attributes.normal.getX(i));uv.setXY(i,(nx>.5?pos.getZ(i):pos.getX(i))/4,pos.getY(i)/4);}return new THREE.Mesh(g,material);}
function stoneHouse(b,ground,mat){
 const group=new THREE.Group(),base=ground.height(b.x,b.z),h=6.0;group.position.set(b.x,base,b.z);group.name=`${b.id} — mapped footprint, approximate stone-house exterior`;group.userData={id:b.id,base,height:h,classification:'reference-photo approximation on mapped footprint'};
 const body=shapedWall(b,h,mat.stone);body.castShadow=body.receiveShadow=true;group.add(body);
 // Roof components follow each polygon edge; keep mapped irregular footprint.
 const roofShape=new THREE.Shape(),p=b.points;roofShape.moveTo(p[0][0]-b.x,-p[0][1]+b.z);for(const v of p.slice(1))roofShape.lineTo(v[0]-b.x,-v[1]+b.z);
 const rg=new THREE.ShapeGeometry(roofShape);rg.rotateX(-Math.PI/2);const roof=new THREE.Mesh(rg,mat.roof);roof.position.y=h+.1;roof.receiveShadow=true;roof.castShadow=true;group.add(roof);
 const tiles=[],frames=[],glass=[],stones=[],rng=random(27);
 // First mapped house is near-rectangular. Low pitch roof is a typological approximation.
 if(b.id==='w611957434'){
  const local=new THREE.Group();local.rotation.y=b.yaw;group.add(local);roof.visible=false;
  const pitch=.11,half=b.d/2+.25;
  const gp=[],guv=[],gi=[];for(const side of [-1,1]){const offset=gp.length/3;gp.push(side*b.w/2,h,-b.d/2,side*b.w/2,h,b.d/2,side*b.w/2,h+half*pitch,0);guv.push(0,h/4,b.d/4,h/4,b.d/8,(h+half*pitch)/4);gi.push(offset,offset+1,offset+2);}const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute(guv,2));gg.setIndex(gi);gg.computeVertexNormals();const gm=mat.stone.clone();gm.side=THREE.DoubleSide;const gable=new THREE.Mesh(gg,gm);gable.castShadow=true;local.add(gable);
  for(const s of [-1,1]){
   const roofside=cuboid(b.w+.5,.14,half*Math.sqrt(1+pitch*pitch),0,h+.13+half*pitch*.5,s*half*.5,mat.roof);roofside.rotation.x=s*Math.atan(pitch);local.add(roofside);
   for(let x=-b.w/2;x<b.w/2;x+=.33)for(let z=.1;z<half;z+=.48){const g=new THREE.CylinderGeometry(.14,.14,.5,12,1,true,Math.PI/2,Math.PI);g.rotateX(Math.PI/2);g.rotateX(s*Math.atan(pitch));g.translate(x,h+.23+(half-z)*pitch,s*z);tiles.push(g);}
   for(let x=-b.w/2+.3;x<b.w/2;x+=1.35)for(let z=.35;z<half;z+=1.65){const g=new THREE.SphereGeometry(1,8,5);g.scale(.23+rng()*.1,.08,.17);g.translate(x,h+.3+(half-z)*pitch,s*z);stones.push(g);}
  }
  const g=mergeGeometries(tiles);tiles.forEach(v=>v.dispose());const m=new THREE.Mesh(g,mat.roof);m.castShadow=m.receiveShadow=true;local.add(m);
  const sg=mergeGeometries(stones);stones.forEach(v=>v.dispose());const sm=new THREE.Mesh(sg,mat.rock);sm.castShadow=true;local.add(sm);
 }
 const orientation=Math.sign(p.slice(1).reduce((sum,v,i)=>sum+p[i][0]*v[1]-v[0]*p[i][1],0));
 for(let i=1;i<p.length;i++){
  const a=p[i-1],b2=p[i],len=Math.hypot(b2[0]-a[0],b2[1]-a[1]),nx=orientation*(b2[1]-a[1])/len,nz=-orientation*(b2[0]-a[0])/len,theta=-Math.atan2(b2[1]-a[1],b2[0]-a[0])+(orientation>0?Math.PI:0);
  // Each facade has masonry jambs, timber shutters, inset dark panes. Approximate spacing.
  for(let level=0;level<2;level++)for(let t=2;t<len-1.3;t+=3.6){
   const x=a[0]-group.position.x+(b2[0]-a[0])*t/len+nx*.12,z=a[1]-group.position.z+(b2[1]-a[1])*t/len+nz*.12,y=1.9+level*2.7;
   const panel=cuboid(.88,1.08,.045,x,y,z,mat.glass);panel.rotation.y=theta;group.add(panel);
   for(const s of [-1,1]){const g=box.clone();g.scale(.12,1.3,.14);g.translate(s*.52,0,.065);g.rotateY(theta);g.translate(x,y,z);frames.push(g);}
   for(const s of [-1,1]){const g=box.clone();g.scale(1.16,.13,.18);g.translate(0,s*.6,.07);g.rotateY(theta);g.translate(x,y,z);frames.push(g);}
   const bar=cuboid(.055,1.1,.1,x,y,z,mat.timber);bar.rotation.y=theta;group.add(bar);
  }
 }
 const fg=mergeGeometries(frames);frames.forEach(g=>g.dispose());if(fg){const fm=new THREE.Mesh(fg,mat.frame);fm.castShadow=true;group.add(fm);}
 const a=p[0],bb=p[1],len=Math.hypot(bb[0]-a[0],bb[1]-a[1]),theta=-Math.atan2(bb[1]-a[1],bb[0]-a[0]),door=new THREE.Group();door.position.set((a[0]+bb[0])/2-b.x,1.15,(a[1]+bb[1])/2-b.z);door.rotation.y=theta;door.add(cuboid(1.35,2.25,.13,0,0,-.01,mat.timber),cuboid(1.6,.18,.35,0,1.19,.07,mat.frame));group.add(door);
 return group;
}
export function createVillage(scene,data,ground,mat){
 const group=new THREE.Group();group.name='Beigang local approximation';scene.add(group);
 const houses=data.geo.buildings.filter(b=>['w611957434','w611957440'].includes(b.id)).map(b=>{const h=stoneHouse(b,ground,mat);group.add(h);return h;});
 // No invented neighbouring houses. Granite wall/paving patches are labelled sample details.
 const detail=new THREE.Group(),house=houses[0],b=data.geo.buildings.find(b=>b.id==='w611957434');detail.position.copy(house.position);detail.rotation.y=b.yaw;group.add(detail);
 const paving=cuboid(19,.22,8,0,-.05,11,mat.concrete);paving.receiveShadow=true;detail.add(paving);
 for(let x=-9;x<=8;x+=.95){const block=cuboid(.9,.5,.55,x,.13,14,mat.stone);block.castShadow=true;detail.add(block);}
 const shrubs=[],rng=random(12);
 for(let i=0;i<44;i++){const s=(i%2?-1:1),x=s*(8.6+rng()*2),z=5+rng()*9,world=new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw).add(house.position);if(!ground.inside(world.x,world.z))continue;shrubs.push({x:world.x,z:world.z,y:ground.height(world.x,world.z),scale:.5+rng()*.8});}
 const leavesPerShrub=190,foliage=new THREE.InstancedMesh(new THREE.PlaneGeometry(.12,.26),mat.leaves,shrubs.length*leavesPerShrub);shrubs.forEach((s,i)=>{for(let k=0;k<leavesPerShrub;k++){const a=rng()*Math.PI*2,r=Math.sqrt(rng())*s.scale,h=.25+rng()*s.scale*.85;obj.position.set(s.x+Math.cos(a)*r,s.y+.15+h,s.z+Math.sin(a)*r);obj.scale.setScalar(.8+rng()*.6);obj.rotation.set((rng()-.5)*2,a,rng()*2);obj.updateMatrix();foliage.setMatrixAt(i*leavesPerShrub+k,obj.matrix);foliage.setColorAt(i*leavesPerShrub+k,new THREE.Color().setHSL(.22+rng()*.04,.2,.5+rng()*.15));}});foliage.castShadow=true;group.add(foliage);
 const beachRocks=[],coast=data.geo.coastlines[data.geo.mainIsland];for(const [x,z] of coast){if(Math.hypot(x-4500,z+6340)<450){for(let k=0;k<3;k++)beachRocks.push({x:x+(rng()-.5)*7,z:z+(rng()-.5)*7,scale:.6+rng()*1.7});}}
 const rocks=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),mat.rock,beachRocks.length);beachRocks.forEach((r,i)=>{obj.position.set(r.x,ground.height(r.x,r.z)+r.scale*.18,r.z);obj.scale.set(r.scale,r.scale*.42,r.scale*.78);obj.rotation.set(rng(),rng()*6,rng());obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix);});rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);
 const c=house.position.clone();return {group,houses,rocks,foliage,centre:c,update(camera,quality){group.visible=camera.position.distanceTo(c)<(quality==='low'?1700:4500);rocks.visible=quality!=='low';}};
}
export function createVegetation(scene,data,ground,mat){
 const rng=random(813),patches=[];
 const crown=document.createElement('canvas');crown.width=256;crown.height=384;const c=crown.getContext('2d'),cr=random(134);
 c.strokeStyle='#5c6250';c.lineWidth=4;c.beginPath();c.moveTo(128,365);c.lineTo(124,80);c.stroke();
 for(let i=0;i<840;i++){const a=cr()*Math.PI*2,r=Math.sqrt(cr()),x=128+Math.cos(a)*r*102*(.6+cr()*.4),y=162+Math.sin(a)*r*139;c.fillStyle=`hsl(${81+cr()*22} ${15+cr()*15}% ${22+cr()*20}%)`;c.beginPath();c.ellipse(x,y,2.5+cr()*5,2+cr()*4,cr()*3,0,Math.PI*2);c.fill();}
 const treeTexture=new THREE.CanvasTexture(crown);treeTexture.colorSpace=THREE.SRGBColorSpace;
 const treeMat=new THREE.MeshStandardMaterial({map:treeTexture,alphaTest:.42,side:THREE.DoubleSide,roughness:.97,envMapIntensity:.1});
 const planes=[];for(const a of [0,Math.PI/3,Math.PI*2/3]){const g=new THREE.PlaneGeometry(1,1);g.rotateY(a);planes.push(g);}const crownGeo=mergeGeometries(planes);planes.forEach(g=>g.dispose());
 const well=data.landmarks.places.find(p=>p.kind==='well');
 const forests=data.geo.areas.filter(a=>['forest','wood','scrub'].includes(a.kind));
 for(const a of forests){const p=a.points,x0=Math.min(...p.map(v=>v[0])),x1=Math.max(...p.map(v=>v[0])),z0=Math.min(...p.map(v=>v[1])),z1=Math.max(...p.map(v=>v[1]));if((x1-x0)*(z1-z0)<800)continue;
  const spots=[],step=a.kind==='scrub'?45:38;
  for(let z=z0;z<z1;z+=step)for(let x=x0;x<x1;x+=step){const xx=x+(rng()-.5)*step*.8,zz=z+(rng()-.5)*step*.8;if(!inside(xx,zz,p)||a.holes.some(h=>inside(xx,zz,h))||!ground.inside(xx,zz)||Math.hypot(xx-well.x,zz-well.z)<65)continue;const h=ground.height(xx,zz);if(h<3)continue;spots.push({x:xx,z:zz,y:h,h:(a.kind==='scrub'?2:5)+rng()*4});if(spots.length>1100)break;}
  if(!spots.length)continue;
  const leaves=new THREE.InstancedMesh(crownGeo,treeMat,spots.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,1,8),mat.timber,spots.length);
  spots.forEach((s,i)=>{obj.position.set(s.x,s.y+s.h*.51,s.z);obj.rotation.set(0,rng()*6,0);obj.scale.set(s.h*.92,s.h,1);obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);leaves.setColorAt(i,new THREE.Color().setScalar(.85+rng()*.3));obj.position.set(s.x,s.y+s.h*.3,s.z);obj.scale.set(1,s.h*.6,1);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);});
  const group=new THREE.Group();group.add(leaves,trunks);scene.add(group);const c=centre(p);patches.push({group,leaves,trunks,x:c[0],z:c[1],r:Math.hypot(x1-x0,z1-z0)/2,count:spots.length});
 }
 return {patches,count:patches.reduce((s,p)=>s+p.count,0),update(camera,quality){const range=quality==='low'?700:quality==='high'?3500:1900;for(const p of patches){const near=Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<range+p.r&&camera.position.y<1500;p.group.visible=near;p.leaves.castShadow=near&&quality==='high';p.trunks.visible=near&&quality!=='low';}}};
}
export function createTurbines(scene,data,ground,mat){
 const wind=data.geo.turbines;
 const bladeShape=new THREE.Shape();bladeShape.moveTo(-.045,0);bladeShape.lineTo(.04,0);bladeShape.bezierCurveTo(.17,.12,.26,.24,.15,.43);bladeShape.lineTo(.027,1);bladeShape.quadraticCurveTo(0,1.015,-.012,1);bladeShape.lineTo(-.09,.42);bladeShape.lineTo(-.055,.10);bladeShape.closePath();const bladeGeometry=new THREE.ExtrudeGeometry(bladeShape,{depth:.012,bevelEnabled:false,curveSegments:8});bladeGeometry.translate(0,-.5,0);bladeGeometry.computeVertexNormals();
 const towers=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.05,1.85,1,24),mat.wind,wind.length),hubs=new THREE.InstancedMesh(new THREE.SphereGeometry(1,18,12),mat.wind,wind.length),blades=new THREE.InstancedMesh(bladeGeometry,mat.wind,wind.length*3);
 const specs=wind.map((p,i)=>{const tagged=parseFloat(p.tags.height||p.tags['generator:height']),h=Number.isFinite(tagged)?tagged:p.onLand?65:115,base=p.onLand?ground.height(p.x,p.z):0,r=h*.36;obj.position.set(p.x,base+h/2,p.z);obj.scale.set(1,h,1);obj.rotation.set(0,0,0);obj.updateMatrix();towers.setMatrixAt(i,obj.matrix);obj.position.set(p.x,base+h,p.z+2);obj.scale.set(1.55,1.55,2.3);obj.updateMatrix();hubs.setMatrixAt(i,obj.matrix);return {...p,h,base,r};});
 const offshore=specs.filter(p=>!p.onLand),yellow=new THREE.MeshStandardMaterial({color:0xa58b32,roughness:.64,metalness:.24}),piles=new THREE.InstancedMesh(new THREE.CylinderGeometry(2.8,3.2,1,28),yellow,offshore.length),platforms=new THREE.InstancedMesh(new THREE.CylinderGeometry(4.2,4.2,.65,28),yellow,offshore.length);
 offshore.forEach((p,i)=>{obj.position.set(p.x,3.5,p.z);obj.scale.set(1,15,1);obj.rotation.set(0,0,0);obj.updateMatrix();piles.setMatrixAt(i,obj.matrix);obj.position.set(p.x,11,p.z);obj.scale.set(1,1,1);obj.updateMatrix();platforms.setMatrixAt(i,obj.matrix);});piles.name='Offshore transition pieces · nominal not surveyed';
 scene.add(towers,hubs,blades,piles,platforms);let previous=-1;
 return {specs,towers,hubs,blades,piles,platforms,offshoreCount:offshore.length,onshoreCount:specs.length-offshore.length,update(time,camera,quality){const visible=camera.position.y<70000;towers.visible=hubs.visible=blades.visible=visible;piles.visible=platforms.visible=visible&&camera.position.y<5500;if(!visible||time-previous<(quality==='low'?.1:.04))return;previous=time;specs.forEach((p,i)=>{for(let k=0;k<3;k++){const a=time*.65+k*Math.PI*2/3+i*.77;obj.position.set(p.x-Math.sin(a)*p.r/2,p.base+p.h+Math.cos(a)*p.r/2,p.z+3.5);obj.scale.set(p.r*.27,p.r,p.r);obj.rotation.set(0,0,a);obj.updateMatrix();blades.setMatrixAt(i*3+k,obj.matrix);}});blades.instanceMatrix.needsUpdate=true;}};
}
