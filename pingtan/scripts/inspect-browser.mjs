import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.__pingtan?.ready,{timeout:90000});await page.waitForTimeout(1800);await page.screenshot({path:'evidence/initial-overview.png'});
console.log(JSON.stringify(await page.evaluate(()=>{const s=window.__pingtan,g=s.renderer.getContext(),ext=g.getExtension('WEBGL_debug_renderer_info');return {gpu:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),render:s.renderer.info.render,tiles:s.ground.tiles.length,trees:s.vegetation.count,peak:s.ui.peak,places:s.nav.places,warnings:s.warnings};}),null,2));
await page.locator('[data-place="beigang"]').click();await page.waitForTimeout(3500);await page.screenshot({path:'evidence/initial-beigang.png'});
await page.locator('#stone-close').click();await page.waitForTimeout(3200);await page.screenshot({path:'evidence/initial-stone.png'});console.log(JSON.stringify({errors},null,2));await browser.close();
