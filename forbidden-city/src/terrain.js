import * as THREE from 'three';
import {Batch,polygon,instances,distanceToSegment,inside} from './geometry.js';
import {vegetation} from './vegetation.js';
import {stonePost,stonePanel} from './balustrade.js';
export function terrain(scene,data,mats){const batch=new Batch(mats),colliders=[],ramps=[],waterAreas=[],bridges=[];
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1800,2000),mats.earth);ground.rotation.x=-Math.PI/2;ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
 const pave=new THREE.PlaneGeometry(753,961);const uv=pave.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*753/3,uv.getY(i)*961/3);const floor=new THREE.Mesh(pave,mats.pave);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=.01;scene.add(floor);
 // Continuous moat, 52 m wide. OSM contributes internal river paths; bank setback is estimated 8 m.
 const W=753/2,L=961/2;for(const sx of [-1,1])batch.box(52,.1,961+120,sx*(W+8+26),-.22,0,'water');batch.box(753+16,.1,52,0,-.22,-(L+8+26),'water');for(const sx of [-1,1])batch.box(W+8-96,.1,52,sx*(96+(W+8-96)/2),-.22,L+8+26,'water');
 waterAreas.push({rect:[W+8, W+60,-L-60,L+60]},{rect:[-W-60,-W-8,-L-60,L+60]},{rect:[96,W+8,L+8,L+60]},{rect:[-W-8,-96,L+8,L+60]},{rect:[-W-8,W+8,-L-60,-L-8]});
 // Perimeter: entrances are gaps, never occluded by a solid wall mesh.
 for(const z of [-L,L])for(const side of [-1,1]){const gap=z>0?95:57,len=W-gap;batch.box(len,10,8,side*(gap+len/2),5,z,'wall');colliders.push({a:[side*gap,z],b:[side*W,z],radius:4,height:10,kind:'wall'});}
 const sideGates=data.buildings.filter(b=>['东华门','西华门'].includes(b.name));
 for(const x of [-W,W]){const z=sideGates.find(b=>Math.sign(b.x)===Math.sign(x))?.z||340;for(const [a,b] of [[-L,z-57],[z+57,L]]){batch.box(8,10,b-a,x,5,(a+b)/2,'wall');colliders.push({a:[x,a],b:[x,b],radius:4,height:10,kind:'wall'});}}
 const battlements=[];for(const z of [-L,L])for(let x=-W;x<W;x+=3){if(Math.abs(x)<(z>0?96:58))continue;battlements.push({x,y:10.55,z,sx:1.4,sy:1.1,sz:1});}for(const x of [-W,W])for(let z=-L;z<L;z+=3){if(sideGates.some(b=>Math.sign(b.x)===Math.sign(x)&&Math.abs(b.z-z)<57))continue;battlements.push({x,y:10.55,z,sx:1,sy:1.1,sz:1.4});}
 scene.add(instances(new THREE.BoxGeometry(1,1,1),mats.wall,battlements));
 for(const wall of data.walls){if(wall.outer)continue;for(let i=1;i<wall.points.length;i++){const a=wall.points[i-1],b=wall.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;batch.box(len,3.5,.65,(a[0]+b[0])/2,1.75,(a[1]+b[1])/2,'wall',-Math.atan2(dz,dx));colliders.push({a,b,radius:.4,height:3.5,kind:'wall'});}}
 for(const water of data.water){if(water.name==='筒子河')continue;if(water.polygon){batch.add(polygon(water.points,[],.05),'water',0,.025,0);waterAreas.push({points:water.points});}else for(let i=1;i<water.points.length;i++){const a=water.points[i-1],b=water.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);batch.box(len,.08,water.width,(a[0]+b[0])/2,.03,(a[1]+b[1])/2,'water',-Math.atan2(dz,dx));waterAreas.push({a,b,radius:water.width/2});}}
 // Five Inner Golden Water bridges: exact locations from OSM path crossings when available.
 const bridgePaths=data.paths.filter(p=>p.bridge&&Math.abs((p.points[0]?.[0]||0))<60&&p.points.some(p=>p[1]>360&&p[1]<440));
 let positions=bridgePaths.map(p=>{const a=p.points[0],b=p.points.at(-1);return{x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w:Math.abs(a[0])<5?7:5,d:Math.hypot(b[0]-a[0],b[1]-a[1])};});
 if(positions.length!==5){const river=data.water.find(w=>w.name==='内金水河'&&!w.polygon);positions=[-38,-19,0,19,38].map(x=>{let z=405,best=Infinity;for(const p of river?.points||[]){if(p[1]<330||p[1]>460)continue;if(Math.abs(p[0]-x)<best){best=Math.abs(p[0]-x);z=p[1];}}return{x,z,w:x===0?7:5,d:17};});}
 for(const bridge of positions){bridge.d=Math.max(12,Math.min(25,bridge.d));bridges.push(bridge);for(let i=0;i<20;i++){const z=bridge.z-bridge.d/2+(i+.5)*bridge.d/20,t=(i+.5)/20,y=.8*Math.sin(Math.PI*t);batch.box(bridge.w,.3,bridge.d/20,bridge.x,y-.15,z,'stone');for(const sx of [-1,1]){batch.box(.18,.8,bridge.d/20,bridge.x+sx*(bridge.w/2-.1),y+.6,z,'stone');if(i%3===0)batch.box(.3,1.25,.3,bridge.x+sx*(bridge.w/2-.1),y+.7,z,'stone');}}}
 // Garden footprint: use institutional 140 x 80 m. Vegetation positions remain estimates.
 batch.box(140,.035,80,-2,.018,-389,'earth');
 // Existing mapped paths are displayed at their own coordinates, with estimated paving widths.
 for(const p of data.paths){if(p.bridge||p.steps)continue;for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len>.5)batch.box(len,.035,Math.abs((a[0]+b[0])/2)<5?4:1.5,(a[0]+b[0])/2,.05,(a[1]+b[1])/2,'stone',-Math.atan2(dz,dx));}}
 vegetation(scene,data.trees,mats);
 const g=batch.finish();g.traverse(o=>{if(o.isMesh&&(o.material===mats.stone||o.material===mats.water||o.material===mats.earth))o.castShadow=false;});scene.add(g);return{groups:[g],colliders,ramps,waterAreas,bridges,positions};
}
export function terraceSteps(scene,platforms,mats){const batch=new Batch(mats),ramps=[],railPosts=[],railPanels=[];
 for(const p of platforms){const xs=p.points.map(p=>p[0]),zs=p.points.map(p=>p[1]),x=(Math.max(...xs)+Math.min(...xs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),z=(Math.max(...zs)+Math.min(...zs))/2;
   if(w<10||p.height<1)continue;
   const sides=p.id==='osm-638449433'?[1]:p.id==='osm-638467894'?[-1]:p.id==='osm-638460849'?[]:[-1,1];
   for(const side of sides){const edge=z+side*d/2,len=p.height*2.8,n=Math.ceil(p.height/.18),width=p.height>5?18:8;const ramp={x,z:edge+side*len/2,w:width,d:len,height:p.height,edge,side};ramps.push(ramp);for(let i=0;i<n;i++){const hh=p.height*(i+1)/n,zz=edge+side*(len-(i+.5)*len/n);batch.box(width,hh,len/n,x,hh/2,zz,'stone');}}
   if(p.height>5)for(let tier=0;tier<3;tier++){
    const scale=1-tier*.018,height=p.height*(tier+1)/3,points=p.points.map(a=>[x+(a[0]-x)*scale,z+(a[1]-z)*scale]);
    for(let segment=1;segment<points.length;segment++){
     const a=points[segment-1],b=points[segment],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.7)continue;
     const count=Math.max(1,Math.round(length/2.7)),span=length/count,angle=-Math.atan2(dz,dx);
     for(let i=0;i<count;i++){const t=i/count,m=(i+.5)/count,xx=a[0]+dx*t,zz=a[1]+dz*t,mx=a[0]+dx*m,mz=a[1]+dz*m;
      // Preserve the central stair route through north/south perimeter edges.
      if(Math.abs(mx-x)<10&&Math.abs(dz)<Math.abs(dx)*.2&&Math.abs(mz-z)>d*.43)continue;
      railPosts.push({x:xx,y:height+.65,z:zz});railPanels.push({x:mx,y:height+.6,z:mz,sx:Math.max(.2,span-.23),sy:.7,sz:.18,ry:angle});
     }
    }
   }
 }
 const g=batch.finish();g.add(instances(stonePost(),mats.stone,railPosts));g.add(instances(stonePanel(),mats.stone,railPanels));scene.add(g);return {group:g,ramps};
}
export function surfaceHeight(x,z,platforms,ramps,bridges){let h=0;for(const p of platforms)if(inside(x,z,p.points)&&!p.holes.some(hole=>inside(x,z,hole)))h=Math.max(h,p.height);for(const r of ramps)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2){const t=1-Math.abs(z-r.edge)/r.d;h=Math.max(h,r.height*Math.max(0,t));}for(const b of bridges)if(Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2){h=Math.max(h,.8*Math.cos((z-b.z)/b.d*Math.PI));}return h;}
