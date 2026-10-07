import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {toLocal,toLonLat} from '../geo.js';
const root=fileURLToPath(new URL('../',import.meta.url));
let pw;try{pw=await import('playwright');}catch{pw=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||path.resolve(root,'../../../../pingtan/node_modules/playwright/index.mjs')));}
const executable=process.env.CHROMIUM_PATH||'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const browser=await pw.chromium.launch({headless:true,executablePath:fs.existsSync(executable)?executable:undefined});
const page=await browser.newPage();await page.goto('http://127.0.0.1:5191/comparison.html');
const info=JSON.parse(fs.readFileSync(path.join(root,'data/terrain/tiles.json')));
const decoded=await page.evaluate(async tiles=>{const out=[];for(const t of tiles){const img=new Image();img.src='./'+t.file;await img.decode();const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,256,256).data;out.push({...t,values:Array.from({length:65536},(_,i)=>pixels[i*4]*256+pixels[i*4+1]+pixels[i*4+2]/256-32768)});}return out;},info.tiles);
await browser.close();
function sample(lon,lat){const n=16384,x=(lon+180)/360*n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n,t=decoded.find(t=>t.x===Math.floor(x)&&t.y===Math.floor(y));if(!t)throw Error('DEM coverage');const px=Math.min(255,Math.max(0,(x-t.x)*256)),py=Math.min(255,Math.max(0,(y-t.y)*256)),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy,v=(x,y)=>t.values[Math.min(y,255)*256+Math.min(x,255)];return (v(ix,iy)*(1-fx)+v(ix+1,iy)*fx)*(1-fy)+(v(ix,iy+1)*(1-fx)+v(ix+1,iy+1)*fx)*fy;}
const corners=[[info.bbox[0],info.bbox[3]],[info.bbox[2],info.bbox[1]]].map(p=>toLocal(...p)),step=12,minX=Math.floor(corners[0][0]/step)*step,minZ=Math.floor(corners[0][1]/step)*step,cols=Math.ceil((corners[1][0]-minX)/step)+1,rows=Math.ceil((corners[1][1]-minZ)/step)+1,referenceElevation=sample(119.4431389,25.9905083),values=[];
// Edge samples clamp to acquired bounds; resampling does not add source accuracy.
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const p=toLonLat(minX+i*step,minZ+j*step),lon=Math.max(info.bbox[0],Math.min(info.bbox[2],p[0])),lat=Math.max(info.bbox[1],Math.min(info.bbox[3],p[1]));values.push(+sample(lon,lat).toFixed(2));}
const result={source:'Mapzen Terrain Tiles / AWS Open Data; USGS SRTM/GMTED2010 + NOAA ETOPO1 global sources',accessed:'2026-10-07',sourceEpoch:'archive composite; local input edition not identified; not 2026 survey',nativeResolutionMetres:'global source approximately 30m or coarser; zoom14 samples are oversampled',verticalReference:'archive height; displayed height is relative to factory-origin sample, not an independently validated national datum',referenceElevation,minX,minZ,step,cols,rows,values,tiles:info.tiles};
fs.writeFileSync(path.join(root,'data/terrain.json'),JSON.stringify(result));
console.log(JSON.stringify({cols,rows,referenceElevation,range:[Math.min(...values),Math.max(...values)],points:[['绘事院',119.4431389,25.9905083],['马限山',119.4457,25.9874],['罗星塔',119.4524701,25.9832905]].map(([name,x,y])=>({name,elevation:sample(x,y)}))},null,2));
