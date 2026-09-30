import { chromium } from 'playwright';
import fs from 'node:fs';

const executable = 'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(executable) ? { executablePath: executable } : {}), args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
await page.goto(process.env.TIANTAN_URL || 'http://127.0.0.1:5182/');
await page.waitForFunction(() => window.__tiantan?.ready, { timeout: 60000 });
await page.evaluate(() => {
  const { camera, controls } = window.__tiantan;
  camera.position.set(0, 19, 82);
  controls.target.set(0, 24, 0);
  controls.update();
});
await page.waitForTimeout(1600);
await page.screenshot({ path: 'evidence/11-prayer-front.png' });
await browser.close();
