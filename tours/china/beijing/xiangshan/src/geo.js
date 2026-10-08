import * as THREE from 'three';

export function inside(x,z,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
export function closestSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);const px=a[0]+dx*t,pz=a[1]+dz*t;return {x:px,z:pz,t,d:Math.hypot(x-px,z-pz)};}
export const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

export class Geography{
 constructor(data,heights){this.data=data;this.heights=heights;this.grid=data.grid;this.hall=data.landmarks.find(p=>p.key==='hall');this.hallAngle=-data.landmarks.find(p=>p.key==='hall').footprintBox.edges[0].angle;this.hallBase=this.raw(this.hall.x+12,this.hall.z)+.3;
  this.waters=data.waters.map(w=>{const xs=w.points.map(p=>p[0]),zs=w.points.map(p=>p[1]);const values=w.points.map(p=>this.raw(...p)).sort((a,b)=>a-b);return {...w,bounds:[Math.min(...xs)-7,Math.max(...xs)+7,Math.min(...zs)-7,Math.max(...zs)+7],level:values[Math.floor(values.length*.25)]-.5};});
  this.pool=this.waters.find(w=>w.id===625875864);if(this.pool)this.pool.level=this.hallBase-2.5;
  const poolLocal=this.pool.points.map(p=>this.hallLocal(...p));
  const crossings=[];for(let i=1;i<poolLocal.length;i++){const a=poolLocal[i-1],b=poolLocal[i];if((a[0]<=0&&b[0]>=0)||(b[0]<=0&&a[0]>=0)){const t=-a[0]/(b[0]-a[0]);crossings.push(a[1]+t*(b[1]-a[1]));}}
  this.courtyard={umin:-14.7,umax:Math.max(...poolLocal.map(p=>p[0]))+1.1,vmin:10.7,vmax:Math.max(...poolLocal.map(p=>p[1]))+4.0,deckY:this.hallBase-.75,bridgeStart:Math.min(...crossings)-.7,bridgeEnd:Math.max(...crossings)+.7,bridgeHalfWidth:1.8,archRise:.68,poolLocal};
  this.segments=[];this.cells=new Map();for(const r of data.roads){for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],seg={a,b,width:r.width,type:r.tags.highway,id:r.id};this.segments.push(seg);for(let x=Math.floor((Math.min(a[0],b[0])-8)/25);x<=Math.floor((Math.max(a[0],b[0])+8)/25);x++)for(let z=Math.floor((Math.min(a[1],b[1])-8)/25);z<=Math.floor((Math.max(a[1],b[1])+8)/25);z++){const k=x+','+z;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(seg);}}}
 }
 raw(x,z){const g=this.grid,u=THREE.MathUtils.clamp((x-g.xmin)/g.step,0,g.nx-1.000001),v=THREE.MathUtils.clamp((z-g.zmin)/g.step,0,g.nz-1.000001),i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,h=this.heights;return (h[j*g.nx+i]*(1-a)+h[j*g.nx+i+1]*a)*(1-b)+(h[(j+1)*g.nx+i]*(1-a)+h[(j+1)*g.nx+i+1]*a)*b;}
 hallLocal(x,z){const dx=x-this.hall.x,dz=z-this.hall.z,c=Math.cos(this.hallAngle),s=Math.sin(this.hallAngle);return [c*dx-s*dz,s*dx+c*dz];}
 hallWorld(u,v){const c=Math.cos(this.hallAngle),s=Math.sin(this.hallAngle);return [this.hall.x+c*u+s*v,this.hall.z-s*u+c*v];}
 bridgeY(v){const c=this.courtyard,t=THREE.MathUtils.clamp((v-c.bridgeStart)/(c.bridgeEnd-c.bridgeStart),0,1);return c.deckY+Math.sin(Math.PI*t)*c.archRise;}
 courtyardSurface(x,z){const [u,v]=this.hallLocal(x,z),c=this.courtyard;if(u<c.umin||u>c.umax||v<c.vmin||v>c.vmax)return null;
  if(Math.abs(u)<c.bridgeHalfWidth&&v>=c.bridgeStart&&v<=c.bridgeEnd)return this.bridgeY(v);
  if(inside(x,z,this.pool.points))return null;
  if(v>=10.675&&v<=14.175&&[-7,0,7].some(center=>Math.abs(u-center)<(center===0?1.6:1.1))){const i=THREE.MathUtils.clamp(Math.floor((14.175-v)/.35),0,9);return c.deckY+(i+1)*.147;}
  return c.deckY;
 }
 height(x,z){let y=this.raw(x,z);const [u,v]=this.hallLocal(x,z);const edge=Math.max(Math.abs(u)-14,Math.abs(v)-12);if(edge<8)y=THREE.MathUtils.lerp(this.hallBase,y,smooth(edge/8));
  // One shared, explicitly inferred courtyard grade supports paving and walking.
  const c=this.courtyard,edgeYard=Math.max(c.umin-u,u-c.umax,c.vmin-v,v-c.vmax);
  // The DSM cannot resolve the apron. Blend this inferred grade over 18 m
  // toward the entrance so a coarse canopy-height jump does not become a road cliff.
  const feather=v>c.vmax?18:6;
  if(edgeYard<feather&&v>9.9)y=THREE.MathUtils.lerp(c.deckY-.09,y,smooth(edgeYard/feather));
  // Micro-grading is visual inference, preserved separately from the untouched DSM.
  for(const w of this.waters){const [x0,x1,z0,z1]=w.bounds;if(x<x0||x>x1||z<z0||z>z1)continue;let d=1e9;for(let i=1;i<w.points.length;i++)d=Math.min(d,closestSegment(x,z,w.points[i-1],w.points[i]).d);if(inside(x,z,w.points))y=w.level-.8;else if(w.id!==this.pool.id&&d<5)y=THREE.MathUtils.lerp(w.level+.15,y,smooth(d/5));}
  return y;
 }
 nearestRoad(x,z,global=false){let min={d:Infinity};const segs=global?this.segments:(this.cells.get(Math.floor(x/25)+','+Math.floor(z/25))||[]);for(const s of segs){const p=closestSegment(x,z,s.a,s.b);if(p.d<min.d)min={...p,segment:s};}return min;}
 walkY(x,z){const courtyard=this.courtyardSurface(x,z);return courtyard!==null?courtyard:this.height(x,z)+.12;}
 canWalk(x,z){const [u,v]=this.hallLocal(x,z);if(this.courtyardSurface(x,z)!==null)return true;if(inside(x,z,this.pool.points))return false;const p=this.nearestRoad(x,z);return !!p.segment&&p.d<=p.segment.width*.5+.2;}
 exclusion(x,z,r=3){if(this.nearestRoad(x,z).d<r+2)return true;for(const b of this.data.buildings)if(inside(x,z,b.points))return true;for(const w of this.waters)if(inside(x,z,w.points))return true;const [u,v]=this.hallLocal(x,z);return Math.abs(u)<17&&v>-15&&v<38;}
}

export function terrainGeometry(geo,xmin,zmin,nx,nz,step,skipFocus=false){const p=[],uv=[],col=[],indices=[];const color=new THREE.Color();for(let j=0;j<nz;j++){for(let i=0;i<nx;i++){const x=xmin+i*step,z=zmin+j*step,y=geo.height(x,z),slope=Math.hypot(geo.raw(x+10,z)-geo.raw(x-10,z),geo.raw(x,z+10)-geo.raw(x,z-10))/20;
  const patch=(Math.sin(x*.025+Math.sin(z*.017)*2)+Math.cos(z*.031+x*.007))*.045;
  // Low-frequency colour varies the canopy/ground, never the elevation.
  color.setRGB(.53+patch,.55+patch*.65,.39+patch*.25);if(slope>.62)color.lerp(new THREE.Color(.49,.45,.35),Math.min(.6,(slope-.62)*.7));
  if(Math.hypot(x-740,z+25)<140)color.setRGB(.32,.31,.23);
  p.push(x,y,z);uv.push(x/5,z/5);col.push(color.r,color.g,color.b);
 }}for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const x=xmin+i*step,z=zmin+j*step;const hole=Array.isArray(skipFocus)?skipFocus:[620,880,-160,180];if(skipFocus&&x>=hole[0]&&x<hole[1]&&z>=hole[2]&&z<hole[3])continue;const a=j*nx+i,b=a+1,c=a+nx,d=c+1;indices.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;}

export function makeRoads(geo,material){const p=[],uv=[],idx=[];let stepped=0;for(const road of geo.data.roads){const original=road.points;let run=0;for(let k=1;k<original.length;k++){const a=original[k-1],b=original[k],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<.02)continue;const n=Math.ceil(l/(road.tags.highway==='steps'?.45:1.7)),ox=-dz/l*road.width/2,oz=dx/l*road.width/2;
  for(let j=0;j<n;j++){const s=j/n,t=(j+1)/n;const x0=a[0]+dx*s,z0=a[1]+dz*s,x1=a[0]+dx*t,z1=a[1]+dz*t;if(geo.courtyardSurface((x0+x1)/2,(z0+z1)/2)!==null)continue;let h0=geo.height(x0,z0)+.09,h1=geo.height(x1,z1)+.09;const base=p.length/3;
   if(road.tags.highway==='steps'){const level=Math.ceil(Math.max(h0,h1)/.16)*.16;h0=level;h1=level;stepped++;}
   if(road.tags.highway==='steps')p.push(x0+ox,h0,z0+oz,x0-ox,h0,z0-oz,x1+ox,h1,z1+oz,x1-ox,h1,z1-oz);else p.push(x0+ox,geo.height(x0+ox,z0+oz)+.10,z0+oz,x0-ox,geo.height(x0-ox,z0-oz)+.10,z0-oz,x1+ox,geo.height(x1+ox,z1+oz)+.10,z1+oz,x1-ox,geo.height(x1-ox,z1-oz)+.10,z1-oz);uv.push(0,(run+l*s)/2,road.width/2,(run+l*s)/2,0,(run+l*t)/2,road.width/2,(run+l*t)/2);idx.push(base,base+2,base+1,base+1,base+2,base+3);
   if(road.tags.highway==='steps'){const low=Math.min(geo.height(x0,z0),geo.height(x1,z1))-.06;const q=p.length/3;p.push(x1+ox,low,z1+oz,x1-ox,low,z1-oz,x1+ox,h1,z1+oz,x1-ox,h1,z1-oz);uv.push(0,0,1,0,0,.2,1,.2);idx.push(q,q+2,q+1,q+1,q+2,q+3);}
  }run+=l;
 }}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;mesh.name='OSM paths; widths & step rhythm estimated';return {mesh,stepped};}

export function makeRoute(geo){const pts=geo.data.route.points.map(p=>new THREE.Vector3(p[0],geo.height(...p)+1,p[1]));const g=new THREE.BufferGeometry().setFromPoints(pts);const mesh=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xf2c174,transparent:true,opacity:.9,depthTest:true}));mesh.visible=false;return mesh;}
