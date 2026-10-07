import fs from 'node:fs';
const query='[out:json][timeout:75];(way["building"](25.9818,119.438,25.996,119.4557);way["highway"](25.9818,119.438,25.996,119.4557);way["leisure"](25.9818,119.438,25.996,119.4557);way["landuse"](25.9818,119.438,25.996,119.4557);way["natural"](25.9818,119.438,25.996,119.4557);way["waterway"](25.9818,119.438,25.996,119.4557);node["natural"~"peak|tree"](25.9818,119.438,25.996,119.4557););out meta geom;';
const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'MaweiHeritageResearch/1.0 (phdsx.github.io)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(90000)});
if(!response.ok)throw Error('Overpass '+response.status);
const data=await response.json();
fs.writeFileSync(new URL('../data/osm-city-context.json',import.meta.url),JSON.stringify(data,null,2));
console.log(JSON.stringify({elements:data.elements.length,timestamp:data.osm3s.timestamp_osm_base,buildings:data.elements.filter(e=>e.tags?.building).length,roads:data.elements.filter(e=>e.tags?.highway).length,water:data.elements.filter(e=>e.tags?.waterway||e.tags?.natural==='water').map(e=>({id:e.id,tags:e.tags,bounds:e.bounds}))},null,2));
