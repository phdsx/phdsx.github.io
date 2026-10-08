import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:process.env.PALACE_CHROME||'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.PALACE_URL||'http://127.0.0.1:5178/');await page.waitForFunction(()=>window.__palace?.ready,{timeout:90000});
 await page.locator('#quality').selectOption('high');
 const views=[['taihe',45,44,108,'11-taihe-realism'],['taihe',-48,16,92,'12-taihe-courtyard'],['jingren',22,13,38,'13-jingren-realism'],['qianqing',32,31,82,'14-qianqing-realism']];
 for(const [id,dx,y,dz,name] of views){await page.evaluate(({id,dx,y,dz})=>{const p=window.__palace,b=p.building.models.find(b=>b.id===id);if(!b)throw new Error(id);p.nav.orbit.target.set(b.x,(b.base||0)+b.h*.42,b.z);p.camera.position.set(b.x+dx,y,b.z+dz);p.nav.orbit.update();},{id,dx,y,dz});await page.waitForFunction(id=>window.__palace.details.cache.has(id),id);await page.waitForTimeout(600);await page.screenshot({path:`evidence/${name}.png`});}
 await page.locator('#quality').selectOption('medium');await page.waitForTimeout(400);await page.screenshot({path:'evidence/16-medium-review.png'});
 const download=page.waitForEvent('download');await page.locator('#capture').click();const file=await download;await file.saveAs('evidence/15-scene-export.png');
 const report={timestamp:new Date().toISOString(),errors,exportBytes:fs.statSync('evidence/15-scene-export.png').size};fs.writeFileSync('evidence/visual-review.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
