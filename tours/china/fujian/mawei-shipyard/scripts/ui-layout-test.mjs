import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||path.resolve(root,'../../../../pingtan/node_modules/playwright/index.mjs')));}
const browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const report={timestampUTC:new Date().toISOString(),browser:await browser.version(),limitations:'Responsive viewport and touch emulation on Windows desktop; no physical phone tested.',cases:[],errors:[],failures:[]};
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';
async function inspect(page,label){
 const result=await page.evaluate(()=>{
  const visible=el=>el&&getComputedStyle(el).display!=='none'&&!el.hidden&&el.getBoundingClientRect().width>0;
  const box=el=>{const r=el.getBoundingClientRect();return {id:el.id||el.className||el.tagName.toLowerCase(),left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
  const problems=[],regions=[...document.querySelectorAll('#hud > *')].filter(visible).map(box);
  for(const r of regions){if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)problems.push('outside viewport: '+r.id);}
  for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++)if(overlap(regions[i],regions[j]))problems.push('HUD overlap: '+regions[i].id+' / '+regions[j].id);
  for(const selector of ['header','footer','.tools','.modes']){const parts=[...document.querySelector(selector).children].filter(visible).map(box);for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)if(overlap(parts[i],parts[j]))problems.push(selector+' child overlap: '+parts[i].id+' / '+parts[j].id);}
  const text=document.createTreeWalker(document.querySelector('header'),NodeFilter.SHOW_TEXT);let n;while(n=text.nextNode()){if(!n.textContent.trim()||!visible(n.parentElement)||n.parentElement.closest('.sr-only,select'))continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();if(r.left<0||r.right>innerWidth)problems.push('header text outside viewport: '+n.textContent.trim());}
  const labels=[...document.querySelectorAll('#labels .label:not([hidden])')].map(box);for(let i=0;i<labels.length;i++){for(const r of regions)if(overlap(labels[i],r))problems.push('label / HUD overlap');for(let j=i+1;j<labels.length;j++)if(overlap(labels[i],labels[j]))problems.push('label / label overlap');}
  if(document.documentElement.scrollWidth>innerWidth)problems.push('horizontal document overflow');
  const list=document.querySelector('#places');return {viewport:[innerWidth,innerHeight],regions,visibleLabels:labels.length,listOpen:!list.hidden,listScrollable:list.scrollHeight>list.clientHeight,problems};
 });report.cases.push({label,...result});for(const problem of result.problems)report.failures.push(label+': '+problem);return result;
}
async function settle(page){await page.waitForFunction(()=>window.__mawei?.ready&&!window.__mawei.nav.transitioning);await page.waitForTimeout(300);}
try{
 for(const [width,height,touch] of [[1440,960,false],[1024,768,false],[901,700,false],[900,700,false],[676,884,false],[540,720,true],[390,844,true],[320,568,true],[844,390,true],[700,480,false],[1280,800,true]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch,isMobile:touch}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(width+'x'+height+': '+e.message));
  await page.goto(base);await settle(page);await page.locator('#quality').selectOption('low');await inspect(page,width+'x'+height+' initial');
  if(await page.locator('#places').isHidden())await page.locator('#places-toggle').click();await page.waitForTimeout(250);const opened=await inspect(page,width+'x'+height+' list expanded');
  if(!opened.listScrollable)report.failures.push(width+'x'+height+': long list has no scrolling');
  if(width===676)await page.screenshot({path:path.join(root,'evidence/ui-676-list.png')});
  await page.locator('[data-place="consulate"]').click();await settle(page);await inspect(page,width+'x'+height+' long place name');
  if(width<=900&&await page.locator('#places').isVisible())report.failures.push(width+'x'+height+': selected place did not collapse list');
  if([676,390].includes(width))await page.screenshot({path:path.join(root,'evidence/ui-'+width+'-selected.png')});
  await page.locator('#walk').click();await settle(page);await inspect(page,width+'x'+height+' walking');
  if(width===844)await page.screenshot({path:path.join(root,'evidence/ui-844-landscape.png')});
  if(await page.locator('#places').isHidden())await page.locator('#places-toggle').click();await page.locator('[data-place="luoxing"]').click();await settle(page);await inspect(page,width+'x'+height+' last list item reached');
  await page.locator('#info-toggle').click();const dialog=await page.locator('#info').boundingBox();if(!dialog||dialog.x<0||dialog.y<0||dialog.x+dialog.width>width+.5||dialog.y+dialog.height>height+.5)report.failures.push(width+'x'+height+': source dialog outside viewport');await page.locator('#info-close').click();await context.close();console.log(width+'x'+height+' checked');
 }
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();await page.goto(base);await settle(page);await page.locator('#walk').click();await settle(page);await page.setViewportSize({width:676,height:884});await page.waitForTimeout(400);await inspect(page,'live resize desktop walking to sidebar');if(await page.locator('#places').isVisible())report.failures.push('live resize: list did not collapse');if(await page.locator('#touch-controls').isHidden())report.failures.push('live resize: movement controls missing');await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(400);await inspect(page,'live resize back to desktop walking');await context.close();
}catch(e){report.failures.push(e.stack||e.message);}finally{await browser.close();fs.writeFileSync(path.join(root,'evidence/ui-layout-results.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,failures:report.failures},null,2));if(report.failures.length||report.errors.length)process.exitCode=1;
