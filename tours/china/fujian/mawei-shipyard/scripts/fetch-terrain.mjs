import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('../data/terrain/tiles.json',import.meta.url)));
for(const t of d.tiles){const r=await fetch(t.url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(t.url+' '+r.status);fs.writeFileSync(new URL('../'+t.file,import.meta.url),Buffer.from(await r.arrayBuffer()));console.log(t.file);}
