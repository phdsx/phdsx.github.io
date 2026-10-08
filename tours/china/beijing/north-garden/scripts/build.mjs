import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','styles.css','src','vendor','data','docs'])fs.cpSync(path.join(root,f),path.join(dist,f),{recursive:true});
console.log('Static assets copied to dist. No runtime network dependencies.');
