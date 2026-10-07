export const EARTH_RADIUS = 6378137;
const E2=6.6943799901413165e-3,DEG=Math.PI/180;
function ecef(lon,lat){lon*=DEG;lat*=DEG;const n=EARTH_RADIUS/Math.sqrt(1-E2*Math.sin(lat)**2);return [n*Math.cos(lat)*Math.cos(lon),n*Math.cos(lat)*Math.sin(lon),n*(1-E2)*Math.sin(lat)];}
function basis(origin){const lon=origin[0]*DEG,lat=origin[1]*DEG;return {p:ecef(...origin),east:[-Math.sin(lon),Math.cos(lon),0],north:[-Math.sin(lat)*Math.cos(lon),-Math.sin(lat)*Math.sin(lon),Math.cos(lat)],up:[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)]};}
export function toLocal(lon,lat,origin=[119.292,26.086]){const b=basis(origin),p=ecef(lon,lat),d=p.map((v,i)=>v-b.p[i]);return [d.reduce((n,v,i)=>n+v*b.east[i],0),-d.reduce((n,v,i)=>n+v*b.north[i],0)];}
export function toLonLat(x,z,origin=[119.292,26.086]){const b=basis(origin),base=b.p.map((v,i)=>v+b.east[i]*x-b.north[i]*z),a2=EARTH_RADIUS**2,b2=a2*(1-E2),weights=[1/a2,1/a2,1/b2],A=b.up.reduce((n,v,i)=>n+v*v*weights[i],0),B=2*base.reduce((n,v,i)=>n+v*b.up[i]*weights[i],0),C=base.reduce((n,v,i)=>n+v*v*weights[i],0)-1,t=-2*C/(B+Math.sqrt(B*B-4*A*C)),p=base.map((v,i)=>v+b.up[i]*t);return [Math.atan2(p[1],p[0])/DEG,Math.atan2(p[2]/(1-E2),Math.hypot(p[0],p[1]))/DEG];}
export function segmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(length||1))),point=[a[0]+dx*t,a[1]+dz*t];return {distance:Math.hypot(p[0]-point[0],p[1]-point[1]),point,t};}
export function nearestRoad(p,roads){let best={distance:Infinity};for(const road of roads)for(let i=1;i<road.points.length;i++){const hit=segmentDistance(p,road.points[i-1],road.points[i]);if(hit.distance<best.distance)best={...hit,road,index:i};}return best;}
export function insidePolygon(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function polygonCollision(p,polygon,radius=.32){return insidePolygon(p,polygon)||polygon.some((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length]).distance<radius);}
export function makeCollision(data,extras=[]){
 const grid=new Map(),size=20;
 const items=data.buildings.map(b=>({id:b.id,polygon:b.footprint})).concat(extras);
 for(const item of items){const p=item.polygon;item.bounds=[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];const b=item.bounds;for(let x=Math.floor((b[0]-.4)/size);x<=Math.floor((b[2]+.4)/size);x++)for(let z=Math.floor((b[1]-.4)/size);z<=Math.floor((b[3]+.4)/size);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);}}
 return {items,blocked(x,z){const bounds=data.bounds;if(x<bounds[0]+1||z<bounds[1]+1||x>bounds[2]-1||z>bounds[3]-1)return true;return (grid.get(Math.floor(x/size)+','+Math.floor(z/size))||[]).some(i=>polygonCollision([x,z],i.polygon));},safe(p){if(!this.blocked(...p))return p;const hit=nearestRoad(p,data.roads);if(!this.blocked(...hit.point))return hit.point;for(let r=.5;r<16;r+=.5)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const q=[hit.point[0]+Math.cos(a)*r,hit.point[1]+Math.sin(a)*r];if(!this.blocked(...q))return q;}throw Error('该位置缺少可安全步行的空间');}};
}
export function footprintFrame(points){
 // Dominant existing edge gives an oriented frame; no fabricated parcel grid.
 let a=points[0],b=points[1],max=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>max){max=d;a=p;b=q;}}
 const angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]),c=Math.cos(angle),s=Math.sin(angle);
 const projected=points.map(p=>[c*p[0]-s*p[1],s*p[0]+c*p[1]]);
 const minX=Math.min(...projected.map(p=>p[0])),maxX=Math.max(...projected.map(p=>p[0])),minZ=Math.min(...projected.map(p=>p[1])),maxZ=Math.max(...projected.map(p=>p[1]));
 return {angle,c,s,minX,maxX,minZ,maxZ,width:maxX-minX,depth:maxZ-minZ,local:projected,world:(x,z)=>[c*x+s*z,-s*x+c*z]};
}
