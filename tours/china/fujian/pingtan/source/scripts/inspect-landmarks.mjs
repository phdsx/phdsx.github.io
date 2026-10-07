import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5187/');await page.waitForFunction(()=>window.__pingtan?.ready,null,{timeout:60000});
await page.locator('#quality').selectOption('high');await page.locator('#places-toggle').click();await page.locator('#map-toggle').click();await page.locator('.toggle').click();
const stats=[];
for(const id of ['jingsha','xianren','shipaiyang','houyan','xiangbi','nanzhai','jiangjun','aoqian']){
 await page.evaluate(id=>window.__pingtan.nav.place(id),id);await page.waitForFunction(()=>!window.__pingtan.nav.transitioning);await page.waitForTimeout(600);await page.screenshot({path:`evidence/${id}.png`});
 stats.push(await page.evaluate(()=>{const s=window.__pingtan,p=s.camera.position;return {id:s.nav.selected.id,clearance:p.y-s.ground.collisionHeight(p.x,p.z),sourceHeight:s.ground.sourceHeight(s.nav.selected.x,s.nav.selected.z),draws:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles};}));
 if(['jingsha','xianren'].includes(id)){await page.evaluate(()=>window.__pingtan.nav.place(window.__pingtan.nav.selected.id,true));await page.waitForFunction(()=>!window.__pingtan.nav.transitioning);await page.waitForTimeout(500);await page.screenshot({path:`evidence/${id}-close.png`});}
}
console.log(JSON.stringify({errors,stats}));fs.writeFileSync('evidence/landmark-inspection.json',JSON.stringify({errors,stats},null,2));await browser.close();
if(errors.length)process.exitCode=1;
