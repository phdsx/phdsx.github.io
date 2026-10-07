import fs from 'node:fs';
import assert from 'node:assert/strict';
import {project,unproject,inside} from '../src/geo.js';
const data=JSON.parse(fs.readFileSync('public/data/geography.json','utf8')),meta=JSON.parse(fs.readFileSync('public/data/terrain.json','utf8'));
assert(data.coastlines[data.mainIsland].length>3000,'retain real coast nodes');
const ring=data.coastlines[data.mainIsland];assert.deepEqual(ring[0],ring.at(-1));assert(inside(0,0,ring));
assert.equal(meta.nx*meta.nz*4,fs.statSync('public/data/surface.f32').size);assert.equal(meta.nx*meta.nz*4,fs.statSync('public/data/elevation-raw.f32').size);assert.equal(meta.nx*meta.nz,fs.statSync('public/data/land.u8').size);
for(const p of [[119.78,25.53],[119.68,25.42],[119.85,25.66]]){const q=unproject(...project(...p));assert(Math.abs(p[0]-q[0])<1e-7&&Math.abs(p[1]-q[1])<1e-7,'UTM roundtrip');}
const east=project(119.78001,25.53);assert(Math.abs(Math.hypot(...east)-1.005)<.02,'metre scale');
assert(data.buildings.find(b=>b.id==='w611957434'));assert(data.buildings.find(b=>b.id==='w611957440'));assert(data.turbines.length>100);
assert(data.areas.find(a=>a.id==='w990631702'&&a.tags.name==='长江澳沙滩'),'retain real intertidal Changjiang beach');
assert.equal(data.turbines.filter(p=>!p.onLand).length,81);assert.equal(data.turbines.filter(p=>p.onLand).length,99);
const source=JSON.parse(fs.readFileSync('public/data/sources.json','utf8'));assert(source.sources.some(s=>s.id==='imagery'&&s.license.includes('CC BY 4.0')));
const landmarks=JSON.parse(fs.readFileSync('public/data/landmarks.json','utf8'));assert.equal(landmarks.inventory.length,19);assert.equal(landmarks.places.length,8);
for(const id of ['jingsha','xianren','shipaiyang','houyan','xiangbi'])assert(landmarks.places.find(p=>p.id===id));
for(const p of landmarks.places){const ll=unproject(p.x,p.z);assert(Math.abs(ll[0]-p.lonLat[0])<1e-6&&Math.abs(ll[1]-p.lonLat[1])<1e-6,'landscape UTM alignment');assert(p.references.length>0&&p.source&&p.accuracy);}
for(const id of ['houyan','shipaiyang']){const p=landmarks.places.find(p=>p.id===id);assert.deepEqual(p.footprint[0],p.footprint.at(-1));}
assert.equal(landmarks.places.find(p=>p.id==='xianren').positionClass,'approximate');
console.log(JSON.stringify({passed:true,coastVertices:ring.length,mainExtentMetres:data.metadata.mainBBox,areaKm2:data.metadata.mainAreaM2/1e6,roads:data.roads.length,buildings:data.buildings.length,turbines:data.turbines.length,checks:['closed source coastline','UTM projection round-trip','metre scale','raw vs modified elevation files','source and sample coverage']},null,2));
