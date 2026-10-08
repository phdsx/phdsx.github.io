import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const target='..';
async function walk(dir,prefix=''){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name==='source'||e.name.startsWith('.'))continue;const name=prefix+e.name,p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p,name+'/'));else{const data=await fs.readFile(p);out.push({file:name,bytes:data.length,gzipBytes:/\.(js|css|html|json|csv|md|txt|svg)$/.test(name)?gzipSync(data).length:null});}}return out;}
const files=await walk(target);
const startup=f=>f.file==='scene.html'||f.file==='favicon.svg'||f.file.startsWith('assets/')||f.file==='models/lion.glb'||/^textures\/.*\.webp$/.test(f.file)||/^data\/(map|venues|species|sources)\.json$/.test(f.file);
const report={date:'2026-10-01',directory:target,totalBytes:files.reduce((s,f)=>s+f.bytes,0),startupAssetBytes:files.filter(startup).reduce((s,f)=>s+f.bytes,0),notes:['Exact local file sizes; not network transfer sizes','Standalone scene startup excludes optional source geography, CSV, licence documents and outer site assets','HTTP compression/cache configuration affects wire bytes; gzip values are offline estimates only'],files};
await fs.writeFile('evidence/resources.json',JSON.stringify(report,null,2));console.log({totalBytes:report.totalBytes,startupAssetBytes:report.startupAssetBytes,files:files.length});
