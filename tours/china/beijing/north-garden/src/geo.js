/** WGS84 horizontal ENU tangent plane, X=east and Z=south, metres.
 * Vertical coordinates are deliberately separate DEM orthometric heights.
 * Never silently convert or interpret GCJ-02 / BD-09 as WGS84.
 */
export const ORIGIN = [116.2025, 40.001];
const rad = Math.PI / 180, a = 6378137, e2 = 6.6943799901413165e-3;
function ecef(lon,lat) {lon*=rad;lat*=rad;const n=a/Math.sqrt(1-e2*Math.sin(lat)**2);return [n*Math.cos(lat)*Math.cos(lon),n*Math.cos(lat)*Math.sin(lon),n*(1-e2)*Math.sin(lat)];}
const o=ecef(...ORIGIN),l=ORIGIN[0]*rad,p=ORIGIN[1]*rad;
export function toLocal(lon,lat,crs='WGS84') {if(crs!=='WGS84')throw new Error('Expected WGS84; coordinate conversion must be explicit');const q=ecef(lon,lat).map((v,i)=>v-o[i]);return [-Math.sin(l)*q[0]+Math.cos(l)*q[1],Math.sin(p)*Math.cos(l)*q[0]+Math.sin(p)*Math.sin(l)*q[1]-Math.cos(p)*q[2]];}
export function toGeo(x,z) {let lon=ORIGIN[0]+x/(111320*Math.cos(p)),lat=ORIGIN[1]-z/111050;for(let i=0;i<4;i++){const [xx,zz]=toLocal(lon,lat);lon+=(x-xx)/(111320*Math.cos(p));lat-=(z-zz)/111050;}return [lon,lat];}
export function inRing(x,z,r) {let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,zi]=r[i],[xj,zj]=r[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))inside=!inside;}return inside;}
export function inPolygon(x,z,p) {return inRing(x,z,p[0])&&!p.slice(1).some(r=>inRing(x,z,r));}
export function polygons(g) {return g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];}
export function lines(g) {return g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];}
export function segmentDistance(x,z,a,b) {const dx=b[0]-a[0],dz=b[1]-a[1];const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function ringDistance(x,z,r) {let d=Infinity;for(let i=1;i<r.length;i++)d=Math.min(d,segmentDistance(x,z,r[i-1],r[i]));return d;}
export function bounds(r){return [Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))];}
export function seeded(seed=47191){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
export function createTerrain(data) {
 const t=data.terrain;
 const waters=data.features.filter(f=>f.kind==='water').flatMap(f=>polygons(f.geometry).map(poly=>({poly,f,box:bounds(poly[0])})));
 const buildings=data.features.filter(f=>f.kind==='building').flatMap(f=>polygons(f.geometry).map(poly=>({poly,f,box:bounds(poly[0])})));
 function raw(x,z){const xx=Math.max(0,Math.min(t.nx-1.00001,(x-t.x0)/t.step)),zz=Math.max(0,Math.min(t.nz-1.00001,(z-t.z0)/t.step));const i=Math.floor(xx),j=Math.floor(zz),u=xx-i,v=zz-j;const h=(dx,dz)=>t.heights[(j+dz)*t.nx+i+dx];return (h(0,0)*(1-u)+h(1,0)*u)*(1-v)+(h(0,1)*(1-u)+h(1,1)*u)*v;}
 function height(x,z){let h=raw(x,z);for(const {poly,f,box:b} of waters){if(x<b[0]-10||x>b[2]+10||z<b[1]-10||z>b[3]+10)continue;const inside=inPolygon(x,z,poly),d=ringDistance(x,z,poly[0]);if(inside)return f.level-.65-Math.min(2,d*.08);if(d<10)h=h*(d/10)+(f.level-.08)*(1-d/10);}
 for(const {poly,f,box:b} of buildings){if(x<b[0]-2||x>b[2]+2||z<b[1]-2||z>b[3]+2)continue;if(inPolygon(x,z,poly))return f.base;const d=ringDistance(x,z,poly[0]);if(d<2)h=h*d/2+f.base*(1-d/2);}
 return h;}
 // Exact interpolation of the rendered PlaneGeometry triangles (a,b,d / b,c,d).
 // Analytic grading is sampled at grid vertices; walking must follow that actual mesh.
 const renderedGrid=Array.from({length:t.nx*t.nz},(_,i)=>height(t.x0+i%t.nx*t.step,t.z0+Math.floor(i/t.nx)*t.step));
 function renderHeight(x,z){const xx=Math.max(0,Math.min(t.nx-1.00001,(x-t.x0)/t.step)),zz=Math.max(0,Math.min(t.nz-1.00001,(z-t.z0)/t.step)),i=Math.floor(xx),j=Math.floor(zz),u=xx-i,v=zz-j,h=(dx,dz)=>renderedGrid[(j+dz)*t.nx+i+dx];return u+v<=1?h(0,0)*(1-u-v)+h(1,0)*u+h(0,1)*v:h(0,1)*(1-u)+h(1,1)*(u+v-1)+h(1,0)*(1-v);}
 const bridges=data.features.filter(f=>f.kind==='road'&&f.tags.bridge==='yes').flatMap(f=>lines(f.geometry).map(line=>({line,width:f.width,level:Math.max(...line.map(p=>renderHeight(...p)),...waters.filter(w=>line.some(p=>inPolygon(...p,w.poly))).map(w=>w.f.level+.8))+.15})));
 function bridgeAt(x,z){return bridges.find(b=>b.line.some((a,i)=>i&&segmentDistance(x,z,b.line[i-1],a)<b.width/2-.3));}
 function surface(x,z){const b=bridgeAt(x,z);return b?b.level:renderHeight(x,z);}
 function canWalk(x,z){if(!inPolygon(x,z,data.boundary))return false;for(const {poly} of buildings)if(inPolygon(x,z,poly)||ringDistance(x,z,poly[0])<.55)return false;if(!bridgeAt(x,z))for(const {poly} of waters)if(inPolygon(x,z,poly)||ringDistance(x,z,poly[0])<.6)return false;return true;}
 return {raw,height,renderHeight,renderedGrid,surface,canWalk,waters,buildings,bridges};
}
