import fs from 'node:fs';
const query='[out:json][timeout:180];relation(id:569810,2001109);out geom;';
const r=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'MaweiHeritageResearch/1.0 (phdsx.github.io)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(220000)});
if(!r.ok)throw Error('Overpass '+r.status);
const d=await r.json();fs.writeFileSync('data/osm-river-polygons.json',JSON.stringify(d,null,2));
console.log(JSON.stringify(d.elements.map(e=>({id:e.id,members:e.members.length})),null,2));

