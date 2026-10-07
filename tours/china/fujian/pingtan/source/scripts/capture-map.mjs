import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});await page.goto(process.env.TEST_URL||'http://127.0.0.1:5187/');await page.waitForFunction(()=>window.__pingtan?.ready);await page.waitForTimeout(900);
const png=await page.evaluate(()=>{const s=window.__pingtan,bb=s.data.geo.metadata.mainBBox,w=bb[2]-bb[0],d=bb[3]-bb[1],c=new s.THREE.OrthographicCamera(-w/2,w/2,d/2,-d/2,1,150000);c.position.set((bb[0]+bb[2])/2,42000,(bb[1]+bb[3])/2);c.up.set(0,0,-1);c.lookAt(c.position.x,0,c.position.z);s.renderer.setSize(840,Math.round(840*d/w),false);s.renderer.render(s.scene,c);const url=s.renderer.domElement.toDataURL('image/png');s.renderer.setSize(innerWidth,innerHeight);return url;});
fs.writeFileSync('evidence/scene-map.png',Buffer.from(png.split(',')[1],'base64'));await browser.close();console.log('Source-aligned orthographic render captured');
