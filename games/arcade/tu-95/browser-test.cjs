/* NODE_PATH should include Playwright. Uses an isolated browser, no user profile. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdir,writeFile,readFile}=require('node:fs/promises');
const {createServer}=require('node:http');
const path=require('node:path');
const {pilot}=require('./physics.test.cjs');
let origin=process.env.TU95_ORIGIN;
let server;
const evidence=path.resolve(__dirname,'../../../docs/audit/evidence/tu-95');
const results=[];
(async()=>{
  await mkdir(evidence,{recursive:true});
  if(!origin) {
    const root=path.resolve(__dirname,'../../..');
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
    server=createServer(async(req,res)=>{
      const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));}
      catch{res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    origin=`http://127.0.0.1:${server.address().port}`;
  }
  const browser=await chromium.launch({headless:true});
  const errors=[],external=[],failed=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',req=>{if(!req.url().startsWith(origin) && !req.url().startsWith('data:'))external.push(req.url());});
    page.on('response',res=>{if(res.status()>=400 && res.url().includes('/tu-95/'))failed.push(res.url());});
    await page.clock.install();
    await page.goto(origin+'/games/arcade/tu-95/index.html');
    await page.waitForFunction(()=>TU95Game.assets.aircraft && TU95Game.assets.scenery);
    await page.clock.runFor(2000);
    assert.equal(await page.evaluate(()=>TU95Game.state.time),0);
    assert.equal(await page.locator('#mission option:disabled').count(),2);
    await page.screenshot({path:path.join(evidence,'desktop-ready.png'),fullPage:true});
    results.push('Ready screen freezes simulation; both generated assets load; later routes locked');
    await page.locator('#start').click();
    await page.keyboard.down('ArrowUp');await page.clock.runFor(3000);await page.keyboard.up('ArrowUp');
    assert.ok(await page.evaluate(()=>TU95Game.state.throttle)>.95);
    assert.ok(await page.evaluate(()=>TU95Game.state.vx)>10);
    await page.locator('#gear').click();assert.equal(await page.evaluate(()=>TU95Game.state.gear),true);
    await page.keyboard.press('KeyF');assert.equal(await page.evaluate(()=>TU95Game.state.flaps),2);
    await page.keyboard.press('KeyP');
    const paused=await page.evaluate(()=>TU95Game.state.time);
    await page.clock.runFor(2000);assert.equal(await page.evaluate(()=>TU95Game.state.time),paused);
    await page.locator('#start').click();
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(()=>TU95Game.state.status),'paused');
    assert.deepEqual(await page.evaluate(()=>TU95Game.input),{});
    await page.locator('#start').click();
    results.push('Real keyboard changes throttle/flaps; ground gear locked; pause and blur freeze and release input');
    await page.locator('#restart').click();
    // Play an entire mission using DOM keyboard events. Never set flight coordinates.
    const keyMap={more:'ArrowUp',less:'ArrowDown',up:'ArrowLeft',down:'ArrowRight',brake:'Space'};
    let previous={},playing;
    for(let n=0;n<1500;n++) {
      const state=await page.evaluate(()=>TU95Game.state);playing=state;
      if(state.status!=='flying')break;
      const oldGear=state.gear,oldFlaps=state.flaps;
      const control=pilot(state);
      if(state.gear!==oldGear)await page.keyboard.press('KeyG');
      if(state.flaps!==oldFlaps)await page.keyboard.press('KeyF');
      for(const [name,key] of Object.entries(keyMap)) {
        if(!!control[name]!==!!previous[name])await page.keyboard[control[name]?'down':'up'](key);
      }
      previous=control;
      await page.clock.runFor(100);
      if(n===160)await page.screenshot({path:path.join(evidence,'desktop-flight.png'),fullPage:true});
    }
    assert.equal(playing.status,'won',JSON.stringify(playing));
    assert.ok(playing.touchdown.sink<=5.5);
    for(const key of Object.values(keyMap))await page.keyboard.up(key);
    await page.screenshot({path:path.join(evidence,'desktop-landing.png'),fullPage:true});
    assert.equal(await page.locator('#mission option:disabled').count(),1);
    const score=await page.locator('#result').textContent();assert.match(score,/分/);
    results.push('Full first mission won using keyboard events; safe touchdown, stop, score and second route unlock');
    await page.locator('#start').click();
    assert.equal(await page.evaluate(()=>TU95Game.state.level.id),'headwind');
    await page.reload();await page.waitForFunction(()=>TU95Game.assets.aircraft);
    assert.equal(await page.locator('#mission option:disabled').count(),1);
    assert.match(await page.locator('#record').textContent(),/1 \/ 3/);
    await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});
    await page.locator('#start').click();await page.locator('#sound').click();
    assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
    await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
    await page.locator('#restart').click();
    await page.keyboard.down('ArrowUp');await page.clock.runFor(28000);await page.keyboard.up('ArrowUp');
    assert.equal(await page.evaluate(()=>TU95Game.state.status),'crashed');
    assert.match(await page.locator('#overlay-text').textContent(),/滑跑冲出跑道/);
    await page.locator('#start').click();assert.equal(await page.evaluate(()=>TU95Game.state.x),100);
    results.push('Next mission, saved unlock after reload, sound toggle, runway overrun explanation and retry');
    assert.deepEqual(external,[],'game makes no third-party requests');
    const gameExternal=[...external];
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
    await phone.clock.install();await phone.goto(origin+'/games/arcade/tu-95/index.html');
    await phone.waitForFunction(()=>TU95Game.assets.aircraft && TU95Game.assets.scenery);
    await phone.screenshot({path:path.join(evidence,'mobile-ready.png'),fullPage:true});
    await phone.locator('#start').tap();await phone.clock.runFor(100);
    await phone.locator('.touch-controls').scrollIntoViewIfNeeded();
    const cdp=await mobile.newCDPSession(phone);
    const touches=[];
    for(const [name,id] of [['up',1],['more',2]]) {
      const box=await phone.locator(`[data-hold="${name}"]`).boundingBox();touches.push({x:box.x+box.width/2,y:box.y+box.height/2,id});
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
    await phone.clock.runFor(500);
    assert.equal(await phone.evaluate(()=>TU95Game.input.more && TU95Game.input.up),true);
    assert.ok(await phone.evaluate(()=>TU95Game.state.pitch)>3);
    assert.ok(await phone.evaluate(()=>TU95Game.state.throttle)>.1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.equal(await phone.evaluate(()=>!!TU95Game.input.more || !!TU95Game.input.up),false);
    results.push('Native two-finger touch changes pitch and throttle together; touchCancel releases both');
    for(const [width,height] of [[320,740],[390,844],[720,1280],[1080,2400]]) {
      await phone.setViewportSize({width,height});
      assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const button of await phone.locator('[data-hold]').all()) {
        const box=await button.boundingBox();assert.ok(box.width>=44 && box.height>=44 && box.x>=0 && box.x+box.width<=width,JSON.stringify(box));
      }
      await phone.screenshot({path:path.join(evidence,`viewport-${width}.png`),fullPage:true});
    }
    results.push('320 / 390 / 720 / 1080 widths have no horizontal overflow; flight touch buttons >=44 px');
    await mobile.close();
    await page.goto(origin+'/games.html?category=arcade',{waitUntil:'domcontentloaded'});
    await page.locator('a.games-directory-card[href="games/arcade/tu-95/index.html"]').waitFor({state:'visible'});
    results.push('Arcade game directory exposes the new game');
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    await writeFile(path.join(evidence,'results.json'),JSON.stringify({results,errors,failed,gameExternal,catalogExternal:external},null,2));
    console.log(JSON.stringify({results,errors,failed,gameExternal},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server?.close());
