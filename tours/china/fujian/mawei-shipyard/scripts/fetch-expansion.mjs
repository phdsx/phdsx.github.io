import fs from 'node:fs';
const query='[out:json][timeout:60];nwr["name"~"罗星|马限|昭忠|船政|天后宫|英国领事|马江|钟楼|船坞|官街"](25.97,119.42,26.005,119.47);out meta geom;';
const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'MaweiHeritageResearch/1.0 (phdsx.github.io)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(90000)});
if(!response.ok)throw Error('Overpass '+response.status);
const data=await response.json();
fs.writeFileSync(new URL('../data/osm-expansion-poi.json',import.meta.url),JSON.stringify(data,null,2));
console.log(JSON.stringify(data.elements.map(e=>({type:e.type,id:e.id,tags:e.tags,bounds:e.bounds,lon:e.lon,lat:e.lat})),null,2));
