import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '../tours/china/beijing/tiantan/source/node_modules/playwright');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'docs/audit/evidence/hill-climb-native');
await mkdir(output, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.mjs':'text/javascript', '.js':'text/javascript', '.wasm':'application/wasm', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp' };
const server = createServer(async (req, res) => {
  try {
    const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    const body = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}) });
const base = `http://127.0.0.1:${server.address().port}`, url = `${base}/games/arcade/hill-climb/index.html`;
const checks=[], errors=[], requests=[];
const check=(condition, message)=>{assert.ok(condition,message); checks.push(message)};
async function clickCanvas(page,x,y) {
  const box=await page.locator('#canvas').boundingBox();
  await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
  await page.mouse.down(); await page.waitForTimeout(100); await page.mouse.up(); await page.waitForTimeout(650);
}
async function ready(page) { await page.waitForFunction(()=>window.HCR_LOCAL_STATE?.language==='zh',{timeout:30000}); await page.waitForTimeout(700); }
const state=page=>page.evaluate(()=>({phase:window.HCR_LOCAL_PHASE,state:window.HCR_LOCAL_STATE,run:window.HCR_LOCAL_RUN,rewards:window.HCR_FREE_REWARDS||0}));
try {
  const page=await browser.newPage({viewport:{width:1000,height:650},locale:'zh-CN'});
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',e=>{if(e.type()==='error')errors.push(e.text())}); page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{if(!localStorage.getItem('phdsx-hill-climb-v1')) localStorage.setItem('phdsx-hill-climb-v1',JSON.stringify({version:1,wallet:1500,levels:{engine:2},best:{countryside:123}}))});
  await page.goto(url); await ready(page);
  check((await state(page)).state.coins===1500,'旧版金币迁入原版存档');
  check(Object.values((await state(page)).state.texts).includes('五关挑战'),'原版挑战界面显示中文');
  await page.screenshot({path:resolve(output,'challenge.png')});
  await clickCanvas(page,.708,.238);
  await page.waitForFunction(()=>window.HCR_FREE_REWARDS===1,{timeout:5000});
  check((await state(page)).rewards===1,'原广告抽选直接免费完成');
  await clickCanvas(page,.775,.118); await clickCanvas(page,.31,.84);
  await page.screenshot({path:resolve(output,'garage.png')});
  check(Object.values((await state(page)).state.texts).includes('引擎'),'原版车库和升级项目显示中文');
  await clickCanvas(page,.27,.34); await page.screenshot({path:resolve(output,'upgrade.png')});
  await clickCanvas(page,.60,.78);
  await page.waitForFunction(()=>window.HCR_FREE_REWARDS===2,{timeout:5000});
  check((await state(page)).state.coins===1500,'免费升级不会扣除金币');
  await clickCanvas(page,.42,.34); await clickCanvas(page,.40,.78); await page.waitForTimeout(800);
  check((await state(page)).state.coins===500,'金币升级按原价扣款一次');
  const before=await state(page); check(before.state.upgrades>=2,'原版升级进度生效');
  await page.waitForTimeout(1000); await page.reload(); await ready(page);
  check((await state(page)).state.coins===500 && (await state(page)).state.upgrades===before.state.upgrades,'刷新后金币和升级保留，旧金币不会重复导入');
  await clickCanvas(page,.775,.118); await clickCanvas(page,.69,.84);
  await page.waitForFunction(()=>window.HCR_LOCAL_PHASE==='driving' && window.HCR_LOCAL_RUN,{timeout:10000});
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowRight');
  const driving=await state(page); check(driving.run.distance>5,'原版车辆接受油门输入并前进');
  await page.screenshot({path:resolve(output,'driving.png')});
  await clickCanvas(page,.95,.09); await page.waitForTimeout(300);
  const paused=await state(page); check(paused.state.paused,'原版暂停菜单暂停物理世界');
  await page.screenshot({path:resolve(output,'pause.png')});
  await page.waitForTimeout(1000); check((await state(page)).run.distance===paused.run.distance,'暂停时距离保持不变');
  check(requests.every(r=>r.startsWith(base)),'游戏运行只请求本地资源');
  check(errors.length===0,'游戏无浏览器运行错误');
  const mobile=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN',isMobile:true,hasTouch:true,deviceScaleFactor:2});
  mobile.on('pageerror',e=>errors.push(e.message)); await mobile.goto(url); await ready(mobile);
  check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'手机竖屏无横向溢出');
  await mobile.screenshot({path:resolve(output,'mobile.png')});
  const cdp=await mobile.context().newCDPSession(mobile);
  async function touch(x,y,duration=120) {
    const box=await mobile.locator('#canvas').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*x,y:box.y+box.height*y,id:0}]});
    await mobile.waitForTimeout(duration);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.waitForTimeout(700);
  }
  await touch(.88,.24); await touch(.5,.865);
  await mobile.waitForFunction(()=>window.HCR_LOCAL_PHASE==='driving' && window.HCR_LOCAL_RUN,{timeout:10000});
  const mobileStart=(await state(mobile)).run.distance;
  await touch(.86,.64,3000);
  check((await state(mobile)).run.distance>mobileStart+5,'手机触摸油门可驱动车辆前进');
  await mobile.screenshot({path:resolve(output,'mobile-driving.png')});
  await mobile.setViewportSize({width:844,height:390}); await mobile.waitForTimeout(700);
  check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'手机横屏无横向溢出');
  await mobile.screenshot({path:resolve(output,'landscape.png')});
  check(errors.length===0,'手机视口无运行错误');
  await writeFile(resolve(output,'results.json'),JSON.stringify({checks,errors,requests:[...new Set(requests)]},null,2));
  console.log(JSON.stringify({passed:checks.length,errors,output},null,2));
} finally { await browser.close(); await new Promise(done=>server.close(done)); }
