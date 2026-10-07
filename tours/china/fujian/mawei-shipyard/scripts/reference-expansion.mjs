import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const refs=[
 ['mawei-luoxing-reference.jpg','https://zygh.fuzhou.gov.cn/zwgk/ztzl/fzcssx/202203/W020220314344993609763.jpg'],
 // The visitor-centre proposal render is not an as-built Yamen reference.
 ['mawei-wide-guide.jpg','https://www.fjczwh.com/images/map/mwcz_panorama.jpg'],
];
for(const [name,url] of refs){try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);const target=path.join(os.tmpdir(),name);fs.writeFileSync(target,Buffer.from(await r.arrayBuffer()));console.log(target);}catch(e){console.log(name+': '+e.message);}}
