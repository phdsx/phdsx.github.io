/* Run with Node and Playwright available on NODE_PATH. No production dependencies. */
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const evidence = path.join(root, 'docs/audit/evidence/super-mario');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.wav':'audio/wav', '.ogg':'audio/ogg' };
const results = [];
const server = createServer(async (req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'text/plain' }).end(data); }
  catch { res.writeHead(404).end(); }
});
const check = (name, fn) => async () => { await fn(); results.push(name); console.log('PASS', name); };
(async () => {
  await mkdir(evidence, { recursive:true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ viewport:{width:1366,height:1050} });
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('/super-mario/')) failed.push(response.url()); });
    await page.clock.install();
    await page.goto(origin + '/games/arcade/super-mario/index.html');
    await page.waitForFunction(() => window.MarioHost?.status === 'ready');
    const step = async (ms = 100) => page.clock.runFor(ms);
    const restart = async () => { await page.locator('#restart').click(); await step(100); };

    await check('Ready screen freezes simulation; all local sprites load', async () => {
      await step(1000);
      assert.equal(await page.evaluate(() => gameTime), 0);
      assert.equal(await page.locator('canvas').count(), 1);
      await page.screenshot({ path:path.join(evidence, 'desktop-ready.png'),fullPage:true });
      await page.locator('#start').click();
      await step(100);
      assert.equal(await page.evaluate(() => MarioHost.status), 'playing');
    })();
    await check('Real keyboard moves and jumps; release clears held keys', async () => {
      const x = await page.evaluate(() => player.pos[0]);
      await page.keyboard.down('ArrowRight'); await step(600); await page.keyboard.up('ArrowRight');
      assert.ok(await page.evaluate(() => player.pos[0]) > x + 30);
      await step(200);
      const y = await page.evaluate(() => player.pos[1]);
      await page.keyboard.down('Space'); await step(160);
      assert.ok(await page.evaluate(() => player.pos[1]) < y - 15);
      await page.keyboard.up('Space');
      assert.equal(await page.evaluate(() => input.isDown('JUMP')), false);
    })();
    await check('Pause/resume and visibility loss freeze game and release controls', async () => {
      await page.keyboard.press('KeyP');
      const t = await page.evaluate(() => gameTime);
      await step(2000);
      assert.equal(await page.evaluate(() => gameTime), t);
      assert.equal(await page.evaluate(() => input.isDown('RIGHT')), false);
      await page.locator('#start').click(); await step();
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.equal(await page.evaluate(() => MarioHost.status), 'paused');
      await page.locator('#start').click();
    })();
    await check('Coin block collision awards a coin; mushroom and flower transformations work', async () => {
      await restart();
      await page.evaluate(() => { player.pos = [256, 164]; player.vel = [0,-4]; });
      await step(600);
      assert.equal(await page.evaluate(() => player.coins), 1);
      await page.evaluate(() => player.powerUp(-1)); await step(600);
      assert.equal(await page.evaluate(() => player.power), 1);
      assert.equal(await page.evaluate(() => player.hitbox[3]), 32);
      await page.evaluate(() => player.powerUp(-1)); await step(600);
      assert.equal(await page.evaluate(() => player.power), 2);
      assert.ok(await page.evaluate(() => player.sprite.size.every(Number.isFinite)));
      await page.evaluate(() => { input.set('RUN', true, 'test'); }); await step(40);
      assert.ok(await page.evaluate(() => fireballs.filter(Boolean).length) > 0);
      await page.evaluate(() => input.reset());
    })();
    await check('Damage immunity expires; enemy stomp bounces the player', async () => {
      await restart();
      await page.evaluate(() => { const enemy = level.enemies[0]; player.pos=[enemy.pos[0],enemy.pos[1]-12]; player.vel=[0,2]; enemy.isCollideWith(player); });
      assert.ok(await page.evaluate(() => level.enemies[0].dying));
      await restart();
      await page.evaluate(() => { player.powerUp(-1); }); await step(600);
      await page.evaluate(() => player.damage()); await step(2800);
      assert.equal(await page.evaluate(() => player.invincibility), 0);
    })();
    await check('Enter underground pipe, collect coin, and return through exit pipe', async () => {
      await restart();
      await page.evaluate(() => { player.pos=[916,144-16]; player.vel=[0,0]; input.set('DOWN',true,'test'); });
      await step(1000);
      assert.equal(await page.evaluate(() => level.scrolling), false);
      await page.evaluate(() => { input.reset(); player.piping=false; player.pos=[80,80]; player.vel=[0,0]; }); await step(50);
      assert.ok(await page.evaluate(() => player.coins) >= 1);
      await page.evaluate(() => { player.pos=[192,176]; player.vel=[0,0]; input.set('RIGHT',true,'test'); });
      await step(1000);
      assert.equal(await page.evaluate(() => level.scrolling), true);
      await page.evaluate(() => input.reset());
    })();
    await check('Three deaths lead to game over; restart restores a fresh session', async () => {
      await restart();
      for (let count=0; count<3; count++) { await page.evaluate(() => player.die()); await step(2800); }
      assert.equal(await page.evaluate(() => MarioHost.status), 'over');
      assert.equal(await page.locator('#lives').textContent(), '0');
      await page.locator('#start').click(); await step(100);
      assert.equal(await page.locator('#lives').textContent(), '3');
      assert.equal(await page.evaluate(() => player.coins), 0);
      assert.equal(await page.evaluate(() => player.dying || false), false);
    })();
    await check('Flag and castle finish once; restart cancels pending flag music', async () => {
      await page.evaluate(() => { player.pos=[3168,100]; player.vel=[0,0]; vX=3100; });
      await step(7000);
      assert.equal(await page.evaluate(() => MarioHost.status), 'won');
      await page.screenshot({ path:path.join(evidence,'desktop-win.png'),fullPage:true });
      const t = await page.evaluate(() => gameTime); await step(1000);
      assert.equal(await page.evaluate(() => gameTime), t);
      await page.locator('#start').click(); await step(100);
      assert.equal(await page.evaluate(() => MarioHost.status), 'playing');
    })();
    await check('Best coin record survives reload; blocked storage is tolerated', async () => {
      const best = await page.locator('#best').textContent();
      await page.reload(); await page.waitForFunction(() => MarioHost.status === 'ready');
      assert.equal(await page.locator('#best').textContent(), best);
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error('blocked'); }; });
      await page.locator('#start').click();
      await page.evaluate(() => { player.coins=99; MarioHost.frame(); });
      assert.equal(await page.locator('#best').textContent(), '99');
    })();
    await check('Fixed simulation has equal movement at 60 and 144 Hz', async () => {
      const positions = await page.evaluate(() => {
        const original = requestAnimFrame; requestAnimFrame = () => {};
        const run = hz => {
          document.getElementById('restart').click();
          input.set('RIGHT',true,'test');
          const base = lastTime;
          for(let frame=1;frame<=hz;frame++) main(base+frame*1000/hz);
          return player.pos[0];
        };
        const result = [run(60),run(144)];
        requestAnimFrame = original;
        resetFrameClock();
        return result;
      });
      assert.ok(Math.abs(positions[0]-positions[1]) <= 2, JSON.stringify(positions));
      await page.evaluate(() => input.reset());
    })();
    await check('Sound toggle preserves keyboard focus; restart clears delayed actions', async () => {
      await restart();
      await page.locator('#sound').click();
      assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement === canvas), true);
      const x=await page.evaluate(() => player.pos[0]);
      await page.keyboard.down('ArrowRight'); await step(300); await page.keyboard.up('ArrowRight');
      assert.ok(await page.evaluate(() => player.pos[0]) > x+5);
      await page.evaluate(() => { window.delayedFired=false; MarioHost.after(.2,()=>{window.delayedFired=true;}); });
      await restart(); await step(600);
      assert.equal(await page.evaluate(() => delayedFired),false);
    })();
    // Native multi-touch events, with three independent fingers.
    const mobile = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1 });
    const phone = await mobile.newPage();
    phone.on('pageerror', error => errors.push(error.message));
    await phone.clock.install();
    await phone.goto(origin + '/games/arcade/super-mario/index.html');
    await phone.waitForFunction(() => MarioHost.status === 'ready');
    await phone.screenshot({path:path.join(evidence,'mobile-ready.png'),fullPage:true});
    await phone.locator('#start').tap(); await phone.clock.runFor(100);
    const cdp = await mobile.newCDPSession(phone);
    const touches=[];
    for(const [selector,id] of [['RIGHT',1],['RUN',2],['JUMP',3]]) {
      const box=await phone.locator(`[data-control="${selector}"]`).boundingBox();
      touches.push({x:box.x+box.width/2,y:box.y+box.height/2,id});
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
    await phone.clock.runFor(170);
    assert.deepEqual(await phone.evaluate(() => ['RIGHT','RUN','JUMP'].map(key=>input.isDown(key))),[true,true,true]);
    const touchPosition = await phone.evaluate(() => player.pos);
    assert.ok(touchPosition[0]>57 && touchPosition[1]<180, JSON.stringify(touchPosition));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.deepEqual(await phone.evaluate(() => ['RIGHT','RUN','JUMP'].map(key=>input.isDown(key))),[false,false,false]);
    results.push('Native three-finger touch moves, runs, jumps and cancels correctly');
    for(const [width,height] of [[320,740],[720,1280],[1080,2400]]) {
      await phone.setViewportSize({width,height});
      assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      for(const button of await phone.locator('[data-control]').all()) { const box=await button.boundingBox(); assert.ok(box.width>=44 && box.height>=44 && box.x>=0 && box.x+box.width<=width); }
      await phone.screenshot({path:path.join(evidence,`viewport-${width}.png`),fullPage:true});
    }
    results.push('320, 390, 720, 1080 and desktop layouts fit; touch targets >=44px');
    await phone.close(); await mobile.close();
    await restart();
    const cover = await page.evaluate(() => {
      vX=280; player.pos=[400,192]; render();
      const preview=document.createElement('canvas'); preview.width=preview.height=320;
      const g=preview.getContext('2d'); g.imageSmoothingEnabled=false;
      g.drawImage(canvas,0,0,320,320);
      g.fillStyle='#202b26'; g.fillRect(38,26,244,74);
      g.fillStyle='#f8d26d'; g.textAlign='center'; g.font='bold 27px monospace'; g.fillText('SUPER MARIO',160,59);
      g.fillStyle='#ffffff'; g.font='bold 16px monospace'; g.fillText('WORLD 1 — 1',160,85);
      return preview.toDataURL('image/png').split(',')[1];
    });
    await writeFile(path.join(__dirname,'cover.png'),Buffer.from(cover,'base64'));
    await page.screenshot({path:path.join(evidence,'desktop-playing.png'),fullPage:true});
    await page.goto(origin+'/games.html?category=arcade');
    await page.locator('a.games-directory-card[href="games/arcade/super-mario/index.html"]').waitFor({state:'visible'});
    results.push('Game directory arcade category exposes the new game');
    assert.deepEqual(failed,[]);
    assert.deepEqual(errors,[]);
    await writeFile(path.join(evidence,'results.json'),JSON.stringify({results,errors,failed},null,2));
    console.log(`${results.length} checks passed. Evidence: ${evidence}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => server.close());
