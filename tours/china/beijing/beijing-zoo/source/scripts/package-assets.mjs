// Local, repeatable metadata packaging. Never downloads or invents animal models.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const json = async p => JSON.parse(await fs.readFile(p,'utf8'));
const species = await json('public/data/species.json');
const bytes = await fs.readFile('public/models/lion.glb');
const manifest = [{id:'lion',speciesId:species.find(s=>s.model)?.id,file:'lion.glb',author:'kenchoo',original:'https://sketchfab.com/3d-models/lion-61d687ca92dc4cafbd5e74e3be40d49d',mirror:'https://raw.githubusercontent.com/code4fukui/vr-cats/main/lion.glb',license:'CC-BY-NC-SA-4.0 (embedded); CC-BY-NC-4.0 (current original page); retain attribution, NC and SA',licenseUrls:['https://creativecommons.org/licenses/by-nc-sa/4.0/','https://creativecommons.org/licenses/by-nc/4.0/'],accessed:'2026-10-01',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),changes:'GLB file unchanged. Runtime size 2.65m; material roughness adjusted; procedural chest breathing and head turn. Source walk clip paused.',demoCount:1,realInventoryCount:null}];
await fs.writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2));
await fs.copyFile('docs/ASSETS.md','public/models/ASSET-LICENSES.md');
await fs.copyFile('node_modules/three/LICENSE','public/THREE-LICENSE.txt');
const materials=await json('../summer-palace/public/textures/manifest.json');
materials.forEach(m=>{m.accessed='2026-10-01';m.changes+='; reused from this repository summer-palace scene';});
await fs.writeFile('public/textures/manifest.json',JSON.stringify(materials,null,2));
await fs.writeFile('public/data/missing-models.json',JSON.stringify(species.filter(s=>!s.model).map(s=>({speciesId:s.id,name:s.name,scientificName:s.scientificName,venueIds:s.locations.map(l=>l.venueId),status:s.modelStatus,needed:'有独立许可、符合已核实分类和真实体型、带接地可验证骨骼的模型；未确认类群应先核实物种'})),null,2));
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const rows=[['物种ID','中文名','科学名（未核实留空）','场馆ID','场馆名','经度','纬度','局部X米','局部Z米','资料日期','核实状态','今日在展确认','来源ID','备注']];
for(const s of species)for(const l of s.locations)rows.push([s.id,s.name,s.scientificName,l.venueId,l.venueName,...l.geographicPosition,...l.worldPosition,s.sourceDate,s.verifiedStatus,s.currentConfirmed,s.sourceIds.join(';'),s.note]);
await fs.writeFile('public/data/species-distribution.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'));
console.log({animalModels:manifest.length,missingModelRecords:species.filter(s=>!s.model).length,lionBytes:bytes.length});
