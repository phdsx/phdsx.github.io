// Requires Playwright with Chromium. Set PLAYWRIGHT_MODULE for bundled packages.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const files=new Map([
  ['/games/puzzle/difference/index.html','text/html'],
  ['/games/classic/classic.js','text/javascript'],
  ['/games/classic/classic-3d.bundle.js','text/javascript'],
  ['/games/classic/classic.css','text/css']
]);
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!files.has(path)){res.writeHead(404);res.end();return}
  try{const data=await readFile(new URL('../../../..'+path,import.meta.url));res.writeHead(200,{'Content-Type':files.get(path)});res.end(data)}
  catch{res.writeHead(500);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const evidence=new URL('../../../../.local-tools/difference-qa/',import.meta.url);
await mkdir(evidence,{recursive:true});
let browser,checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++};
const samples={
  webgl:[[[64,110],[124,110]],[[175,343],[280,276],[388,344],[393,356]],[[41,399],[86,342],[128,389]],[[314,475],[388,475]],[[258,410],[294,493],[291,450]]],
  canvas:[[[61,111],[125,111]],[[168,350],[280,268],[390,350]],[[36,399],[84,350],[130,399]],[[338,482],[402,490]],[[259,411],[298,493]]]
};
try{
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  for(const mode of ['webgl','canvas'])for(const [name,viewport] of [['desktop',{width:1280,height:1000}],['mobile',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,deviceScaleFactor:name==='mobile'?2:1,isMobile:name==='mobile',hasTouch:name==='mobile',locale:'zh-CN'});
    if(mode==='canvas')await context.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:getContext.call(this,type,...args)};
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/games/puzzle/difference/index.html');
    const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await frame();
    check(await page.evaluate(()=>Boolean(window.PHDSXClassic3D))===(mode==='webgl'),`${name}: expected ${mode} renderer`);
    await page.screenshot({path:fileURLToPath(new URL(`${mode}-${name}.png`,evidence))});
    const stats=()=>page.locator('.classic-stats').innerText();
    const tap=async(x,y)=>{
      const point=await page.locator('#stage').evaluate((canvas,{x,y})=>{
        const r=canvas.getBoundingClientRect(),bx=canvas.clientLeft,by=canvas.clientTop;
        return {x:r.left+bx+x*(r.width-2*bx)/960,y:r.top+by+y*(r.height-2*by)/640};
      },{x,y});
      if(name==='mobile')await page.touchscreen.tap(point.x,point.y);
      else await page.mouse.click(point.x,point.y);
      await frame();
    };
    const reset=async()=>{await page.locator('#restart').click();await frame()};
    for(const points of samples[mode])for(const [x,y] of points)for(const shift of [0,480]){
      await reset();await tap(x+shift,y);
      check((await stats()).includes('找到 1 / 5')&&(await stats()).includes('错点 0 / 8'),`${mode} ${name}: visible target at ${x+shift},${y}`);
      await tap(x+480-shift,y);
      check((await stats()).includes('找到 1 / 5')&&(await stats()).includes('错点 0 / 8'),`${mode} ${name}: repeated target on the other side`);
    }
    await reset();
    for(const [index,points] of samples[mode].entries()){const [x,y]=points[0];await tap(x+index%2*480,y)}
    check(await page.locator('#overlay-title').innerText()==='全部找到了！',`${mode} ${name}: all five differences can be found`);
    check((await stats()).includes('错点 0 / 8'),`${mode} ${name}: finding all differences costs no mistakes`);
    await page.screenshot({path:fileURLToPath(new URL(`${mode}-${name}-found.png`,evidence))});
    await reset();await tap(224,396);
    check((await stats()).includes('找到 0 / 5')&&(await stats()).includes('错点 1 / 8'),`${mode} ${name}: identical windows are a miss`);
    if(mode==='webgl'){
      await reset();await tap(280,320);
      check((await stats()).includes('找到 0 / 5')&&(await stats()).includes('错点 1 / 8'),`${name}: empty roof interior is not a target`);
      await reset();await tap(94,110);
      await page.evaluate(()=>{document.querySelector('.classic-3d').remove();delete window.PHDSXClassic3D});
      await frame();await tap(84+480,350);
      check((await stats()).includes('找到 2 / 5')&&(await stats()).includes('错点 0 / 8'),`${name}: Canvas fallback preserves progress and uses its own outlines`);
    }
    await reset();await page.locator('#pause').click();await tap(92,111);
    check((await stats()).includes('找到 0 / 5')&&(await stats()).includes('错点 0 / 8'),`${mode} ${name}: paused clicks do not count`);
    await page.locator('#pause').click();
    for(let i=0;i<8;i++)await tap(450,100);
    check(await page.locator('#overlay-title').innerText()==='机会用完了',`${mode} ${name}: eight genuine mistakes end the game`);
    await reset();check((await stats()).includes('找到 0 / 5')&&(await stats()).includes('错点 0 / 8'),`${mode} ${name}: restart clears counters`);
    check(errors.length===0,`${mode} ${name}: no page errors: ${errors.join('; ')}`);
    console.log(`${mode} ${name}: passed`);
    await context.close();
  }
  console.log(`${checks} browser checks passed.`);
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
