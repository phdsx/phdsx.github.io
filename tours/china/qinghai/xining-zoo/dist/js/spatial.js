export function inside(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
export function nearestSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;const point=[a[0]+t*dx,a[1]+t*dz];return{point,distance:Math.hypot(p[0]-point[0],p[1]-point[1]),t}}
// Match PlaneGeometry's a-b-d / b-c-d triangle diagonal, including the coarse LOD.
// Bilinear DEM resampling happens offline; runtime ground queries must hit the rendered triangles.
export function heightAt(data,x,z,stride=1){const [x0,z0]=data.extent,step=data.step*stride;const maxI=(data.nx-1)/stride,maxJ=(data.nz-1)/stride;const a=Math.max(0,Math.min(maxI,(x-x0)/step)),b=Math.max(0,Math.min(maxJ,(z-z0)/step));const i=Math.min(Math.floor(a),maxI-1),j=Math.min(Math.floor(b),maxJ-1),u=a-i,v=b-j;const s=(di,dj)=>data.heights[(j+dj)*stride*data.nx+(i+di)*stride]-data.datum;return u+v<=1?s(0,0)+(s(1,0)-s(0,0))*u+(s(0,1)-s(0,0))*v:s(1,1)+(s(0,1)-s(1,1))*(1-u)+(s(1,0)-s(1,1))*(1-v)}
export function toGeo(origin,x,z){const R=6378137;return[origin[0]+x/(R*Math.cos(origin[1]*Math.PI/180))*180/Math.PI,origin[1]-z/R*180/Math.PI]}
export function makeNavigation(layout,terrain){
 const segments=layout.roads.filter(r=>r.walkable).flatMap(r=>r.points.slice(1).map((p,i)=>({a:r.points[i],b:p,width:r.width,id:r.id})));
 function collision(p,radius=.3){if(!inside(p,layout.boundary))return true;for(const b of [...layout.buildings,...layout.areas.filter(a=>a.kind==='water')]){if(inside(p,b.points))return true;for(let i=1;i<b.points.length;i++)if(nearestSegment(p,b.points[i-1],b.points[i]).distance<radius)return true}return false}
 function nearest(p){let best=null;for(const seg of segments){const q=nearestSegment(p,seg.a,seg.b);if(!best||q.distance<best.distance)best={...q,seg}}return best}
 function valid(p){const q=nearest(p);return Boolean(q&&q.distance<=q.seg.width/2-.3&&!collision(p))}
 function snap(p){let candidates=[];for(const s of segments){const q=nearestSegment(p,s.a,s.b);candidates.push(q.point);for(let t=.1;t<1;t+=.1)candidates.push([s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t])}candidates.sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]));return candidates.find(q=>valid(q))||null}
 function step(p,dx,dz){const next=[...p],n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<n;i++){const tx=next[0]+dx/n,tz=next[1]+dz/n;const acceptable=q=>valid(q)&&Math.abs(heightAt(terrain,...q)-heightAt(terrain,...next))<.28;if(acceptable([tx,tz])){next[0]=tx;next[1]=tz}else if(acceptable([tx,next[1]])){next[0]=tx}else if(acceptable([next[0],tz])){next[1]=tz}}return next}
 return{segments,collision,nearest,valid,snap,step};
}
