import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output='data/resource-manifest.json';
const runtimeFiles=new Set([
  'index.html','style.css','viewer.css','app.js','geo.js','navigation.js','materials.js',
  'geometry.js','buildings.js','landmarks.js','city-scene.js','scene.js','data/site.json','data/sources.json',
]);
const category=p=>p.startsWith('vendor/')?'dependency':p.startsWith('textures/')?'material':
  p.startsWith('data/')?'geographic-data':p.startsWith('evidence/')?'verification':
  p.startsWith('scripts/')?'tooling':/\.(js|css|html)$/.test(p)?'application':'documentation';
const files=[];
function collect(directory=''){
  for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=[directory,entry.name].filter(Boolean).join('/');
    if(entry.name==='node_modules'||entry.name==='.git'||relative===output)continue;
    if(entry.isDirectory())collect(relative);
    else if(entry.isFile()){
      const bytes=fs.readFileSync(path.join(root,relative));
      files.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
        category:category(relative),runtime:runtimeFiles.has(relative)||/^vendor\/.*\.js$/.test(relative)||/^textures\/.*\.(jpg|webp|png)$/.test(relative)});
    }
  }
}
collect();
const manifest={
  generatedAt:new Date().toISOString(),algorithm:'SHA-256',
  scope:'All delivered project files, excluding this manifest itself and node_modules/.git. Runtime flag covers the main scene and its local dependencies, including optional PBR textures.',
  runtimeBytes:files.filter(f=>f.runtime).reduce((sum,f)=>sum+f.bytes,0),
  totalBytes:files.reduce((sum,f)=>sum+f.bytes,0),
  fileCount:files.length,
  licenceRecords:['THIRD_PARTY_NOTICES.md','data/sources.json','textures/manifest.json','vendor/THREE-LICENSE.txt'],
  files,
};
fs.writeFileSync(path.join(root,output),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({fileCount:manifest.fileCount,runtimeBytes:manifest.runtimeBytes,totalBytes:manifest.totalBytes,output},null,2));
