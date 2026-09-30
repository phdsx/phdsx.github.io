import fs from 'node:fs';
let d=JSON.parse(fs.readFileSync('public/data/layout.json'));let s=JSON.parse(fs.readFileSync('public/data/sources.json'));console.log(d.sites.find(x=>x.name==='海岳开襟'));if(fs.existsSync('evidence/test-results.json')){let r=JSON.parse(fs.readFileSync('evidence/test-results.json'));console.log(r.failures,r.safeJumps?.filter(x=>!x.safe||x.distance>120));}
