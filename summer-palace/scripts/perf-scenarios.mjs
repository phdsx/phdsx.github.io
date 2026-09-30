import { chromium } from "playwright";
import fs from "node:fs";
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    "C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await b.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const results = [];
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5184/palace/");
  await page.waitForFunction(() => window.__summer?.ready, null, {
    timeout: 90000,
  });
  for (const [view, quality] of [
    ["default", "low"],
    ["default", "medium"],
    ["default", "high"],
    ["overview", "medium"],
    ["walking-corridor", "medium"],
  ]) {
    await page.locator("#quality").selectOption(quality);
    await page.evaluate((view) => {
      const s = window.__summer;
      if (view === "default") {
        s.nav.setMode("orbit");
        s.nav.orbit.target.set(-420, 25, -780);
        s.camera.position.set(180, 250, 450);
        s.nav.orbit.update();
      } else if (view === "overview") s.nav.home();
      else {
        s.nav.selected = s.sites.find((b) => b.id === "corridor");
        s.nav.setMode("walk");
      }
    }, view);
    await page.waitForTimeout(800);
    const sample = await page.evaluate(async () => {
      const times = [];
      let prev = performance.now();
      await new Promise((resolve) => {
        const start = prev;
        function frame(now) {
          times.push(now - prev);
          prev = now;
          if (now - start < 5000) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      times.shift();
      times.sort((a, b) => a - b);
      const s = window.__summer,
        mean = times.reduce((a, b) => a + b, 0) / times.length;
      return {
        frames: times.length,
        durationSeconds: 5,
        observedRafFps: +(1000 / mean).toFixed(1),
        meanFrameMs: +mean.toFixed(2),
        p95FrameMs: +times[Math.floor(times.length * 0.95)].toFixed(2),
        drawCalls: s.renderer.info.render.calls,
        triangles: s.renderer.info.render.triangles,
        pixelRatio: s.renderer.getPixelRatio(),
      };
    });
    results.push({ view, quality, ...sample });
  }
} finally {
  await b.close();
}
fs.writeFileSync(
  "evidence/scenario-performance.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      viewport: "1440×960, deviceScaleFactor1",
      method:
        "5-second requestAnimationFrame samples, headless hardware WebGL, isolated sequential scenarios; refresh-capped, not GPU timer or universal FPS claim",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
