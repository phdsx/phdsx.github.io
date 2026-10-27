/* NODE_PATH must include Playwright and pngjs. Runs a local fixture server. */
const assert=require('node:assert/strict');
const {createServer}=require('node:http');const {readFile,mkdir,writeFile}=require('node:fs/promises');const path=require('node:path');
const {chromium}=require('playwright');const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'../../..'),evidence=path.join(root,'docs/audit/evidence/tu-95-original');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.swf':'application/x-shockwave-flash','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
function pixelsChanged(a,b,rect){const A=PNG.sync.read(a),B=PNG.sync.read(b);let changed=0;for(let y=Math.floor(A.height*rect[1]);y<Math.floor(A.height*rect[3]);y++)for(let x=Math.floor(A.width*rect[0]);x<Math.floor(A.width*rect[2]);x++){let p=(y*A.width+x)*4;if(Math.abs(A.data[p]-B.data[p])+Math.abs(A.data[p+1]-B.data[p+1])+Math.abs(A.data[p+2]-B.data[p+2])>30)changed++;}return changed;}
(async()=>{
  await mkdir(evidence,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.TU95_CHROMIUM || undefined});const tests=[],errors=[],external=[],failed=[];
  try{
    const page=await browser.newPage({viewport:{width:1366,height:1100}});
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});page.on('response',r=>{if(r.status()>=400 && r.url().includes('/tu-95/'))failed.push(r.url());});
    await page.goto(origin+'/games/arcade/tu-95/index.html');await page.waitForFunction(()=>window.TU95Host?.ready,{},{timeout:90000});await page.waitForTimeout(4500);
    const metadata=await page.locator('#game-frame').evaluate(f=>f.contentWindow.TU95Runtime.metadata);assert.equal(metadata.width,670);assert.equal(metadata.height,450);assert.equal(metadata.frameRate,24);assert.equal(metadata.numFrames,31);
    await page.locator('#game-frame').screenshot({path:path.join(evidence,'menu.png')});await page.screenshot({path:path.join(evidence,'desktop.png'),fullPage:true});tests.push('Original SWF boots into Chinese menu with 670×450 stage, 24 fps and 31 root frames');
    const box=await page.locator('#game-frame').boundingBox();const click=(x,y)=>page.mouse.click(box.x+box.width*x,box.y+box.height*y);
    await click(.81,.13);await page.waitForTimeout(3200);await page.locator('#game-frame').screenshot({path:path.join(evidence,'controls.png')});
    await click(.81,.13);await page.waitForTimeout(3200);await page.locator('#game-frame').screenshot({path:path.join(evidence,'mission-1.png')});
    await click(.81,.13);await page.waitForTimeout(3500);
    const before=await page.locator('#game-frame').screenshot({path:path.join(evidence,'flight-before.png')});
    await page.keyboard.down('ArrowUp');await page.waitForTimeout(3000);await page.keyboard.up('ArrowUp');
    const after=await page.locator('#game-frame').screenshot({path:path.join(evidence,'flight-keyboard.png')});
    const speedChanges=pixelsChanged(before,after,[.04,.25,.18,.49]);assert.ok(speedChanges>50,`speed instrument did not change: ${speedChanges}`);tests.push(`Real keyboard accelerated plane; speed instrument changed (${speedChanges} pixels)`);
    await page.keyboard.press('KeyP');await page.waitForFunction(()=>TU95Host.paused);assert.equal(await page.locator('#game-frame').evaluate(f=>f.contentWindow.TU95Runtime.isPlaying),false);await page.locator('#resume').click();assert.equal(await page.evaluate(()=>TU95Host.paused),false);tests.push('P pauses while the game frame has focus; resume works');
    await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.locator('#sound').click();
    await page.locator('#restart').click();await page.waitForFunction(()=>TU95Host.ready,{},{timeout:90000});await page.waitForTimeout(3000);tests.push('Sound toggle and reload to original menu work');
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
    await phone.goto(origin+'/games/arcade/tu-95/index.html');await phone.waitForFunction(()=>TU95Host.ready,{},{timeout:90000});await phone.waitForTimeout(4000);
    const mbox=await phone.locator('#game-frame').boundingBox();const tap=(x,y)=>phone.touchscreen.tap(mbox.x+mbox.width*x,mbox.y+mbox.height*y);
    await tap(.81,.13);await phone.waitForTimeout(3000);await tap(.81,.13);await phone.waitForTimeout(3000);await tap(.81,.13);await phone.waitForTimeout(3500);
    const touchBefore=await phone.locator('#game-frame').screenshot();
    await phone.locator('.touch-controls').scrollIntoViewIfNeeded();const cdp=await mobile.newCDPSession(phone);const points=[];
    for(const [name,id] of [['up',1],['left',2]]){const r=await phone.locator(`[data-hold="${name}"]`).boundingBox();points.push({x:r.x+r.width/2,y:r.y+r.height/2,id});}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await phone.waitForTimeout(2500);
    assert.deepEqual((await phone.locator('#game-frame').evaluate(f=>f.contentWindow.TU95Runtime.pressed)).sort(),['left','up']);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.deepEqual(await phone.locator('#game-frame').evaluate(f=>f.contentWindow.TU95Runtime.pressed),[]);
    const touchAfter=await phone.locator('#game-frame').screenshot();const touchChange=pixelsChanged(touchBefore,touchAfter,[.04,.25,.18,.49]);
    assert.ok(touchChange>10,`touch did not change speed indicator: ${touchChange}`);
    tests.push(`Native two-finger touch changes the speed indicator (${touchChange} pixels); cancellation releases both`);
    for(const [width,height] of [[320,740],[390,844],[720,1280],[1080,2400]]){
      await phone.setViewportSize({width,height});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const button of await phone.locator('[data-hold],[data-tap]').all()){const r=await button.boundingBox();assert.ok(r.width>=44 && r.height>=44 && r.x>=0 && r.x+r.width<=width,JSON.stringify(r));}
      await phone.screenshot({path:path.join(evidence,`mobile-${width}.png`),fullPage:true});
    }
    await mobile.close();tests.push('320 / 390 / 720 / 1080 layouts fit and touch targets are at least 44 px');
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
    await writeFile(path.join(evidence,'results.json'),JSON.stringify({tests,errors,failed,external},null,2));console.log(JSON.stringify({tests,errors,failed,external},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
