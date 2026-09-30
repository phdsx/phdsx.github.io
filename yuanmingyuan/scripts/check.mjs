import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('public/data/layout.json'));
const refs=JSON.parse(fs.readFileSync('public/data/sources.json'));
assert.equal(d.epoch,1786);assert.equal(d.units,'metres');assert.deepEqual(d.origin,[116.298,40.006]);
assert(d.sites.length>=45&&d.water.length>=20);
assert(new Set(d.sites.map(s=>s.id)).size===d.sites.length);
for(const s of d.sites){assert(s.position.every(Number.isFinite));assert(s.exterior&&s.interior&&s.color&&s.furnishing);for(const id of s.sources)assert(refs.some(r=>r.id===id));const x=(s.lon-d.origin[0])*111320*Math.cos(d.origin[1]*Math.PI/180),z=-(s.lat-d.origin[1])*111320;assert(Math.hypot(x-s.position[0],z-s.position[1])<.02)}
for(const w of d.water){assert(w.outer.length>3);assert(w.outer.every(p=>p.every(Number.isFinite)));for(const h of w.holes)assert(h.length>3)}
for(const prefix of ['bark','paving','rock','forest'])for(const type of ['color','normalgl','roughness'])assert(fs.existsSync(`public/textures/${prefix}-${type}.webp`));
assert(!d.sites.some(s=>['新宫门','同道堂','承恩堂','慎德堂'].includes(s.name)));
console.log(`PASS: ${d.sites.length}点位 / ${d.water.length}水系 / ${d.paths.length}辅助路线；坐标往返误差<2cm（仅计算误差，非地图精度）；四类证据及来源完整。`);
