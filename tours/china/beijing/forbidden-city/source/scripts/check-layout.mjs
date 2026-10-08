import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync('public/data/layout.json','utf8')),landmarks=JSON.parse(fs.readFileSync('public/data/landmarks.json','utf8'));
assert.equal(data.metadata.width,753);assert.equal(data.metadata.length,961);
for(const b of data.buildings){assert(b.points.length>=3,b.id);assert(b.points.flat().every(Number.isFinite),b.id);assert(b.w>0&&b.d>0,b.id);}
const names=['太和殿','中和殿','保和殿','乾清门','乾清宫','交泰殿','坤宁宫','钦安殿','神武门'];const axis=names.map(n=>data.buildings.find(b=>b.name===n));assert(axis.every(Boolean));for(let i=1;i<axis.length;i++)assert(axis[i].z<axis[i-1].z,'轴线南北顺序');
assert(data.buildings.filter(b=>b.x<-180).length>150);assert(data.buildings.filter(b=>b.x>180).length>150);
const taihe=landmarks.items.find(b=>b.id==='taihe');assert(Math.abs(taihe.h+taihe.base-35.05)<1e-8);
assert.equal(new Set(data.buildings.map(b=>b.id)).size,data.buildings.length);
console.log(`布局核对通过：${data.buildings.length}轮廓；${data.walls.length}院墙线；${data.paths.length}道路线；中轴顺序和东西区覆盖通过。`);
