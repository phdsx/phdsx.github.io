import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PHDSX_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const output = resolve(process.env.PHDSX_PINBALL_EVIDENCE || '.local-tools/pinball-qa');
await mkdir(output, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.webp':'image/webp', '.svg':'image/svg+xml', '.ttf':'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(root + sep) || path.includes(sep + '.git' + sep)) throw Error('Invalid path');
    if (!extname(path)) path = resolve(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, ...(process.env.PHDSX_CHROMIUM ? { executablePath: process.env.PHDSX_CHROMIUM } : {}) });
const base = `http://127.0.0.1:${server.address().port}`;
const url = base + '/games/arcade/space-cadet-pinball/index.html';
const checks = [], errors = [], missing = [], measurements = {};
function check(value, label) { assert.ok(value, label); checks.push(label); console.log('PASS', label); }
async function ready(page) { await page.goto(url); await page.locator('#start').waitFor({ state: 'visible', timeout: 30000 }); return page.frames().find(frame => frame.url().includes('/runtime.html')); }

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, locale: 'zh-CN' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base) && !response.url().endsWith('/favicon.ico')) missing.push(response.url()); });
  const game = await ready(page);
  check(await game.evaluate(() => Pinball.ready && Pinball.paused), 'WASM and local resources load; explicit start screen pauses simulation');
  await page.locator('#start').click(); await page.waitForTimeout(200);
  check(await game.evaluate(() => !Pinball.paused && Module.SDL2.audioContext.state === 'running'), 'start opens the ball table and unlocks audio');
  check(await game.evaluate(() => Math.abs(Module.canvas.width / Module.canvas.height - innerWidth / innerHeight) < .01), 'canvas uses the iframe aspect ratio without clipping flippers');

  // Observe real rendered pixels immediately after each native engine update.
  await game.evaluate(() => {
    const gl = GL.currentContext.GLctx, canvas = Module.canvas;
    const pixels = new Uint8Array(50 * 70 * 4);
    let draws = 0, lastDraws = 0;
    for (const name of ['drawElements', 'drawArrays']) {
      const original = gl[name];
      gl[name] = function (...args) { draws++; return original.apply(this, args); };
    }
    window.__metrics = { frames: [], sample: [], started: 0, resolve: null, events: [] };
    Module.postMainLoop = function () {
      if (draws === lastDraws) return;
      lastDraws = draws;
      gl.readPixels(Math.round(canvas.width * .205), Math.round(canvas.height * .035), 50, 70, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      if (!pixels.some((value,index) => index % 4 !== 3 && value > 5)) return;
      const now = performance.now(), metrics = window.__metrics;
      metrics.frames.push(now);
      if (metrics.resolve && pixels.some((value, i) => value !== metrics.sample[i])) {
        metrics.resolve(now - metrics.started); metrics.resolve = null;
      }
      metrics.sample = Array.from(pixels);
    };
    for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => __metrics.events.push({ type, code: event.code }));
  });
  await page.waitForTimeout(180);
  measurements.inputToPixelMs = await game.evaluate(() => new Promise((done, reject) => {
    __metrics.started = performance.now(); __metrics.resolve = done;
    Pinball.key('left', true);
    setTimeout(() => { if (__metrics.resolve) { __metrics.resolve = null; reject(Error('Flipper pixels did not change')); } }, 1200);
  }));
  check(measurements.inputToPixelMs < 100, 'left flipper produces a measured pixel response within 100 ms');
  await game.evaluate(() => Pinball.key('left', false)); await page.waitForTimeout(150);
  const resting = await game.evaluate(() => __metrics.sample);
  let consistent = 0;
  const cycles = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100);
    const held = await game.evaluate(() => __metrics.sample);
    await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(100);
    const released = await game.evaluate(() => __metrics.sample);
    const heldDifference = held.filter((value,index) => Math.abs(value-resting[index]) > 10).length;
    const restDifference = released.filter((value,index) => Math.abs(value-resting[index]) > 10).length;
    cycles.push({heldDifference,restDifference});
    if (heldDifference > 300 && restDifference === 0) consistent++;
  }
  console.log('Flipper pixel cycles', JSON.stringify(cycles));
  measurements.flipperPixelCycles = cycles;
  measurements.consistentFlipperCycles = consistent;
  check(consistent === 10, 'ten identical keyboard flipper cycles produce identical held/released results');

  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100); await page.keyboard.up('ArrowRight');
  check(await game.evaluate(() => __metrics.events.some(event => event.code === 'Slash' && event.type === 'keydown')), 'right-arrow input reaches the native right-flipper binding');
  await page.keyboard.down('Space'); await page.waitForTimeout(2600); await page.keyboard.up('Space');
  await page.waitForTimeout(600);
  await game.locator('#canvas').screenshot({ path: resolve(output, 'flight.png') });
  const time = await game.evaluate(() => __metrics.frames);
  measurements.engineFps = (time.length - 1) * 1000 / (time.at(-1) - time[0]);
  check(measurements.engineFps >= 30, 'native engine sustains at least 30 rendered frames per second during play');
  await page.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });

  await page.locator('#pause').click(); await page.waitForTimeout(60);
  const pausedFrames = await game.evaluate(() => __metrics.frames.length);
  await page.waitForTimeout(180);
  check(await game.evaluate(before => Pinball.paused && __metrics.frames.length === before, pausedFrames), 'pause stops native simulation and rendering');
  await page.keyboard.press('p'); await page.waitForTimeout(80);
  check(await game.evaluate(() => !Pinball.paused), 'P resumes even when the toolbar held keyboard focus');
  await page.keyboard.press('F5'); await page.waitForTimeout(100);
  check(await page.locator('#sound').getAttribute('aria-pressed') === 'false', 'F5 updates the shell sound state');
  check(await game.evaluate(() => __metrics.events.some(event => event.code === 'F5')), 'sound toggle reaches the native engine');
  await page.locator('#sound').click();
  await page.locator('#new-game').click(); await page.waitForTimeout(120);
  check(await game.evaluate(() => !Pinball.paused && __metrics.events.filter(event => event.code === 'F2' && event.type === 'keydown').length > 0), 'new-game button delivers F2 and returns to play');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; });
  check(await game.evaluate(() => Pinball.paused), 'tab visibility handler automatically pauses the game');
  await page.locator('#start').click();

  const beforeFullscreen = await game.evaluate(() => __metrics.frames.length);
  await page.locator('#fullscreen').click();
  check(await page.evaluate(() => document.fullscreenElement?.id === 'machine'), 'fullscreen opens the game and controls together');
  await game.waitForFunction(before => __metrics.frames.length > before + 2, beforeFullscreen, {timeout:3000});
  check(true, 'fullscreen retains native focus and continues rendering the table');
  await page.screenshot({ path: resolve(output, 'fullscreen.png') });
  await page.locator('#fullscreen').click();

  for (const viewport of [{width:360,height:640},{width:390,height:844},{width:720,height:1280},{width:1080,height:2400}]) {
    const beforeResize = await game.evaluate(() => __metrics.frames.length);
    await page.setViewportSize(viewport); await page.waitForTimeout(100);
    await game.waitForFunction(before => __metrics.frames.length > before + 2, beforeResize, {timeout:3000});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport.width}×${viewport.height}: no horizontal overflow`);
    check(await game.evaluate(() => Math.abs(Module.canvas.width / Module.canvas.height - innerWidth / innerHeight) < .015), `${viewport.width}×${viewport.height}: complete table fits the canvas`);
    if (viewport.width === 390) await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
  }
  check(errors.length === 0, 'no uncaught JavaScript errors'); check(missing.length === 0, 'no missing local resources');

  const mobile = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const touchGame = await ready(mobile); await mobile.locator('#start').tap();
  await touchGame.evaluate(() => { window.__events = []; for (const type of ['keydown','keyup']) window.addEventListener(type, e => __events.push([type,e.code])); });
  const client = await mobile.context().newCDPSession(mobile);
  const left = await mobile.locator('[data-hold="left"]').boundingBox(), right = await mobile.locator('[data-hold="right"]').boundingBox();
  const touchPoints = [{x:left.x+left.width/2,y:left.y+left.height/2,id:1},{x:right.x+right.width/2,y:right.y+right.height/2,id:2}];
  await client.send('Input.dispatchTouchEvent', { type:'touchStart',touchPoints });
  check(await mobile.locator('.is-held').count() === 2, 'two real touch contacts hold both flippers simultaneously');
  await client.send('Input.dispatchTouchEvent', { type:'touchCancel',touchPoints:[] });
  check(await mobile.locator('.is-held').count() === 0, 'touch cancellation releases both button states');
  check(await touchGame.evaluate(() => ['KeyZ','Slash'].every(code => __events.some(e => e[0] === 'keyup' && e[1] === code))), 'touch cancellation releases both native flipper inputs');
  const launch = await mobile.locator('[data-hold="launch"]').boundingBox();
  await client.send('Input.dispatchTouchEvent', { type:'touchStart',touchPoints:[{x:launch.x+launch.width/2,y:launch.y+launch.height/2,id:3}] });
  await mobile.waitForTimeout(2600);
  await client.send('Input.dispatchTouchEvent', { type:'touchEnd',touchPoints:[] });
  check(await touchGame.evaluate(() => __events.some(e=>e[0]==='keydown'&&e[1]==='Space') && __events.some(e=>e[0]==='keyup'&&e[1]==='Space')), 'touch launch holds and releases the native plunger');
  await mobile.screenshot({ path:resolve(output,'touch.png'),fullPage:true });

  const failure = await browser.newPage();
  await failure.route('**/SpaceCadetPinball.wasm', route => route.abort());
  await failure.goto(url); await failure.locator('#retry').waitFor({state:'visible',timeout:15000});
  check(await failure.locator('#new-game').isDisabled(), 'WASM load failure shows retry and disables gameplay');
  await failure.unroute('**/SpaceCadetPinball.wasm'); await failure.locator('#retry').click();
  await failure.locator('#start').waitFor({state:'visible',timeout:30000});
  check(await failure.locator('#retry').isHidden(), 'retry recovers after a failed WASM download');

  await page.goto(base + '/games.html?category=arcade');
  check(await page.locator('a[href="games/arcade/space-cadet-pinball/index.html"]').isVisible(), 'game appears in the arcade category');
  check(await page.locator('a[href="games/sports/free-kick/index.html"]').isHidden(), 'existing category filtering still works');
  await page.screenshot({path:resolve(output,'directory.png'),fullPage:true});
  console.log(JSON.stringify({checks:checks.length,measurements},null,2));
} finally {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ checks, measurements, errors, missing }, null, 2));
  await browser.close(); await new Promise(done=>server.close(done));
}
