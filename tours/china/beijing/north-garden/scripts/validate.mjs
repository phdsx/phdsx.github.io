import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {toLocal,toGeo,ORIGIN,createTerrain,inPolygon,polygons,ringDistance,segmentDistance,lines} from '../src/geo.js';
import {PlaneGeometry,Mesh,MeshBasicMaterial,Raycaster,Vector3,DoubleSide} from '../vendor/three.module.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const data=JSON.parse(fs.readFileSync(path.join(root,'data/scene.json'),'utf8'));const source=JSON.parse(fs.readFileSync(path.join(root,'data/source.geojson'),'utf8'));
// Independent ellipsoidal inverse calculation (Vincenty), not a scene-distance tautology.
function vincenty(a,b){const rad=Math.PI/180,A=6378137,f=1/298.257223563,B=(1-f)*A,L=(b.lon-a.lon)*rad,U1=Math.atan((1-f)*Math.tan(a.lat*rad)),U2=Math.atan((1-f)*Math.tan(b.lat*rad));let lam=L,sinSig,cosSig,sig,sinA,cos2A,cos2M;
 for(let i=0;i<100;i++){sinSig=Math.hypot(Math.cos(U2)*Math.sin(lam),Math.cos(U1)*Math.sin(U2)-Math.sin(U1)*Math.cos(U2)*Math.cos(lam));if(sinSig===0)return 0;cosSig=Math.sin(U1)*Math.sin(U2)+Math.cos(U1)*Math.cos(U2)*Math.cos(lam);sig=Math.atan2(sinSig,cosSig);sinA=Math.cos(U1)*Math.cos(U2)*Math.sin(lam)/sinSig;cos2A=1-sinA*sinA;cos2M=cos2A?cosSig-2*Math.sin(U1)*Math.sin(U2)/cos2A:0;const C=f/16*cos2A*(4+f*(4-3*cos2A)),prev=lam;lam=L+(1-C)*f*sinA*(sig+C*sinSig*(cos2M+C*cosSig*(-1+2*cos2M*cos2M)));if(Math.abs(prev-lam)<1e-13)break;if(i===99)throw Error('Vincenty failed to converge');}
 const u=cos2A*(A*A-B*B)/(B*B),aa=1+u/16384*(4096+u*(-768+u*(320-175*u))),bb=u/1024*(256+u*(-128+u*(74-47*u))),delta=bb*sinSig*(cos2M+bb/4*(cosSig*(-1+2*cos2M*cos2M)-bb/6*cos2M*(-3+4*sinSig*sinSig)*(-3+4*cos2M*cos2M)));return B*aa*(sig-delta);}
assert.ok(toLocal(...ORIGIN).every(v=>v===0));assert.throws(()=>toLocal(116.2,40,'GCJ-02'));
let maxRoundtrip=0,maxGeometryError=0;
for(const p of data.controlPoints){const v=toLocal(p.lon,p.lat),r=toGeo(...v);maxRoundtrip=Math.max(maxRoundtrip,Math.abs(r[0]-p.lon),Math.abs(r[1]-p.lat));assert.ok(Math.hypot(v[0]-p.local[0],v[1]-p.local[1])<.001);}
assert.ok(maxRoundtrip<1e-9);
for(const sf of source.features.filter(f=>f.id.startsWith('way/'))){const f=data.features.find(x=>x.id===sf.properties.osm_id);if(!f)continue;const all=(c)=>typeof c[0]==='number'?[c]:c.flatMap(all),srcCoords=all(sf.geometry.coordinates),sceneCoords=all(f.geometry.coordinates);assert.equal(srcCoords.length,sceneCoords.length);srcCoords.forEach((p,i)=>{const q=toLocal(...p);maxGeometryError=Math.max(maxGeometryError,Math.hypot(q[0]-sceneCoords[i][0],q[1]-sceneCoords[i][1]));});}
assert.ok(maxGeometryError<.001);
assert.ok(!data.features.some(f=>['661458570','942770890','942770891'].includes(f.id)),'South Garden must be absent');
assert.equal(data.meta.boundary,'OSM relation/8758747');
const terrain=createTerrain(data);let buildingChecks=0,waterChecks=0;
const t=data.terrain,g=new PlaneGeometry((t.nx-1)*t.step,(t.nz-1)*t.step,t.nx-1,t.nz-1);g.rotateX(-Math.PI/2);g.translate(t.x0+(t.nx-1)*t.step/2,0,t.z0+(t.nz-1)*t.step/2);const pos=g.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,terrain.height(pos.getX(i),pos.getZ(i)));const ground=new Mesh(g,new MeshBasicMaterial({side:DoubleSide}));ground.updateMatrixWorld();let maxGroundHeightError=0;
for(const [x,z] of [[-105.3828,304.6443],...data.controlPoints.map(p=>p.local),...data.trees.filter((_,i)=>i%400===0).map(p=>p.slice(0,2))]){const ray=new Raycaster(new Vector3(x,1500,z),new Vector3(0,-1,0)),hit=ray.intersectObject(ground)[0];assert.ok(hit);maxGroundHeightError=Math.max(maxGroundHeightError,Math.abs(hit.point.y-terrain.renderHeight(x,z)));}
assert.ok(maxGroundHeightError<.0001,'Walking terrain must match actual rendered triangles');
for(const {poly,f} of terrain.buildings){const r=poly[0];const cx=r.reduce((s,p)=>s+p[0],0)/r.length,cz=r.reduce((s,p)=>s+p[1],0)/r.length;if(inPolygon(cx,cz,poly)){assert.equal(terrain.canWalk(cx,cz),false);buildingChecks++;}assert.ok(Number.isFinite(f.base));}
for(const {poly} of terrain.waters){let tested=false;for(const p of poly[0]){if(!terrain.bridgeAt&& !terrain.canWalk(...p)){tested=true;break;}}if(tested)waterChecks++;}
assert.equal(terrain.canWalk(20000,20000),false);
let minimumClearance=Infinity;for(const [x,z,type,h] of data.trees){assert.ok(inPolygon(x,z,data.boundary));const radius=h*(type?.17:.26);for(const {poly} of [...terrain.buildings,...terrain.waters]){assert.ok(!inPolygon(x,z,poly));minimumClearance=Math.min(minimumClearance,ringDistance(x,z,poly[0])-radius);}assert.ok(terrain.canWalk(x,z));}
assert.ok(minimumClearance>0,'Tree crowns must not intersect mapped water/buildings');
const pairs=[[0,1],[1,2],[2,3]],distanceChecks=pairs.map(([i,j])=>{const a=data.controlPoints[i],b=data.controlPoints[j],reference=vincenty(a,b),scene=Math.hypot(a.local[0]-b.local[0],a.local[1]-b.local[1]),error=scene-reference;assert.ok(Math.abs(error)<.01);return {from:a,to:b,referenceMetres:reference,sceneMetres:scene,errorMetres:error,errorPercent:100*error/reference,interpretation:'Coordinate pipeline check against OSM WGS84. Not an independent surveyed ground truth.'};});
const report={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()),timestamp:new Date().toISOString(),counts:data.counts,maxRoundtripDegrees:maxRoundtrip,maxGeometryErrorMetres:maxGeometryError,maxRenderedGroundHeightErrorMetres:maxGroundHeightError,buildingCollisionSamples:buildingChecks,waterCollisionSamples:waterChecks,minimumTreeCrownClearanceMetres:minimumClearance,southGardenExcluded:true,distanceChecks};
fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

