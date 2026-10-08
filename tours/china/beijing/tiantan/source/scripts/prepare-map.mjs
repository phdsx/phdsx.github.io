import fs from 'node:fs';
const xml=fs.readFileSync('research/osm-map.xml','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&')]));
const nodes=new Map([...xml.matchAll(/<node\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)].map(m=>{const a=attrs(m[1]);return[a.id,[+a.lon,+a.lat]];}));
const raw=[...xml.matchAll(/<way\s+([^>]+)>([\s\S]*?)<\/way>/g)].map(m=>({id:attrs(m[1]).id,tags:Object.fromEntries([...m[2].matchAll(/<tag\s+([^>]+)\/>/g)].map(t=>{const a=attrs(t[1]);return[a.k,a.v];})),geo:[...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map(n=>nodes.get(n[1])).filter(Boolean)}));
const q=raw.find(w=>w.tags.name==='祈年殿');
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const unique=q.geo.slice(0,-1);const origin=[mean(unique.map(p=>p[0])),mean(unique.map(p=>p[1]))];
const project=([lon,lat])=>[(lon-origin[0])*Math.PI/180*6378137*Math.cos(origin[1]*Math.PI/180),-(lat-origin[1])*Math.PI/180*6378137].map(v=>Math.round(v*100)/100);
const boundary=raw.find(w=>w.id==='24824550').geo.map(project);
function inside([x,z]){let c=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
const ways=raw.map(w=>({...w,points:w.geo.map(project)})).filter(w=>w.points.length>1&&w.points.some(inside)&&(w.tags.building||w.tags.highway||w.tags.barrier||w.tags.name||w.tags.natural||w.tags.landuse||w.tags.leisure)).map(({geo,...w})=>w);
const result={origin,projection:'WGS84 equirectangular local tangent approximation, R=6378137; x east, y up, z south; metre',source:'https://www.openstreetmap.org/api/0.6/map?bbox=116.397,39.871,116.422,39.892',license:'ODbL 1.0; © OpenStreetMap contributors',boundary,ways};
fs.writeFileSync('public/data/layout.json',JSON.stringify(result));
console.log({origin,bounds:[Math.min(...boundary.map(p=>p[0])),Math.max(...boundary.map(p=>p[0])),Math.min(...boundary.map(p=>p[1])),Math.max(...boundary.map(p=>p[1]))],ways:ways.length,landmarks:ways.filter(w=>['祈年殿','皇穹宇','圜丘','神乐署','斋宫','丹陛桥'].includes(w.tags.name)).map(w=>({name:w.tags.name,x:mean(w.points.map(p=>p[0])),z:mean(w.points.map(p=>p[1]))}))});
