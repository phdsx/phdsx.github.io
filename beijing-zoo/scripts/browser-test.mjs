import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:5185/";
const executablePath =
  process.env.CHROMIUM_PATH ||
  "C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
await fs.mkdir("evidence", { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const errors = [],
  requests = [],
  failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() });
});
page.on("requestfailed", (r) =>
  requests.push({ url: r.url(), reason: r.failure()?.errorText }),
);
const report = {
  testDate: "2026-10-01",
  url: base,
  viewport: { width: 1440, height: 960, dpr: 1 },
  browser: await browser.version(),
  mode: "Headless Chromium on this host; WebGL renderer read below; no physical mobile device",
  errors,
  failedRequests: requests,
  failures,
  checks: [],
  performance: [],
};
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__zoo?.ready, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
  report.scene = await page.evaluate(() => {
    const z = window.__zoo,
      g = z.renderer.getContext(),
      ext = g.getExtension("WEBGL_debug_renderer_info");
    return {
      gpu: ext
        ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : g.getParameter(g.RENDERER),
      buildings: z.data.buildings.length,
      trees: z.world.treeCount,
      animal: z.world.animalStatus,
      modelAnimations: z.world.animal?.clips,
    };
  });
  check(await page.locator("#loading").isHidden(), "loading dismissed");
  await page.screenshot({ path: "evidence/final-gate.png" });
  report.checks.push("Scene load, local data/textures/GLB load");
  await page.locator("#home").click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: "evidence/final-overview.png" });
  const before = await page.evaluate(() =>
    window.__zoo.camera.position.toArray(),
  );
  await page.mouse.move(870, 410);
  await page.mouse.down();
  await page.mouse.move(970, 470, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(
    (await page.evaluate(() => window.__zoo.camera.position.toArray())).some(
      (n, i) => Math.abs(n - before[i]) > 1,
    ),
    "orbit rotation",
  );
  const zoomBefore = await page.evaluate(() =>
    window.__zoo.camera.position.distanceTo(window.__zoo.controls.target),
  );
  await page.mouse.wheel(0, -260);
  await page.waitForTimeout(300);
  check(
    (await page.evaluate(() =>
      window.__zoo.camera.position.distanceTo(window.__zoo.controls.target),
    )) < zoomBefore,
    "orbit zoom",
  );
  const panBefore = await page.evaluate(() =>
    window.__zoo.controls.target.toArray(),
  );
  await page.mouse.move(900, 500);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(940, 520, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(200);
  check(
    (await page.evaluate(() => window.__zoo.controls.target.toArray())).some(
      (n, i) => Math.abs(n - panBefore[i]) > 0.2,
    ),
    "orbit pan",
  );
  report.checks.push("Bird view rotate, zoom, pan, reset");
  await page.locator("#search").fill("非洲狮");
  check(
    (await page.locator(".result[data-species]").count()) === 1,
    "animal search",
  );
  await page.locator(".result[data-species]").click();
  check(
    (await page.locator("#info h2").textContent()) === "狮虎山",
    "search matches venue",
  );
  check(
    (await page.locator("#info-content").textContent()).includes("2023-01-12"),
    "source date visible",
  );
  check(
    (await page.locator('#info a[href*="beijing.gov.cn"]').count()) > 0,
    "source links visible",
  );
  const mapIds = await page
    .locator("#minimap [data-venue]")
    .evaluateAll((es) => es.map((e) => e.dataset.venue));
  check(mapIds.includes("v-273416876"), "map and search venue agree");
  await page.locator("#near-view").click();
  await page.locator("#close-info").click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: "evidence/final-lion.png" });
  report.animalGround = await page.evaluate(() => window.__zoo.world.animalMetrics());
  check(report.animalGround.inside,'animal point in mapped enclosure');
  check(report.animalGround.min[1]>=-.01&&report.animalGround.min[1]<.15,'animal ground contact');
  const headBefore=report.animalGround.head;
  const animalStart = await page.evaluate(() => ({
    point: window.__zoo.world.animal.point,
    root: window.__zoo.world.animal.root.position.toArray(),
  }));
  await page.waitForTimeout(1500);
  check(
    JSON.stringify(
      await page.evaluate(() =>
        window.__zoo.world.animal.root.position.toArray(),
      ),
    ) === JSON.stringify(animalStart.root),
    "animal remains in enclosure",
  );
  const headAfter=await page.evaluate(()=>window.__zoo.world.animalMetrics().head);
  check(headAfter.some((v,i)=>Math.abs(v-headBefore[i])>.00001),'subtle rigged head motion');
  const projected=await page.evaluate(()=>window.__zoo.world.animalMetrics().projected);
  await page.mouse.click(projected[0],projected[1]);
  check(await page.locator('#info').isVisible(),'animal mesh click');
  check(await page.locator('#info h2').textContent()==='狮虎山','animal click belongs to lion venue');
  await page.locator('#close-info').click();
  report.checks.push(
    "Animal search, venue/source detail, minimap agreement, close animal observation, bounded idle",
  );
  await page.locator("#search").fill("");
  await page.locator('[data-category="reptile"]').click();
  check(
    (await page.locator("#results").textContent()).includes("两栖爬行动物馆"),
    "reptile filter",
  );
  check(
    (await page.evaluate(() => window.__zoo.filteredVenueIds)).every(
      (id) => id === "v-25375863",
    ),
    "filtered map venues",
  );
  await page.locator('[data-category="bird"]').click();
  check((await page.locator(".result").count()) === 3, "bird class records");
  await page.locator('[data-category="all"]').click();
  await page.locator("#search").fill("不存在的动物");
  check(await page.locator(".empty").isVisible(), "empty search");
  await page.locator("#search").fill("长颈鹿馆");
  await page.locator(".result[data-species]").click();
  check(
    (await page.locator("#info h2").textContent()).includes("长颈鹿"),
    "venue name search",
  );
  await page.locator("#close-info").click();
  await page.locator("#search").fill("");
  report.checks.push("Category filters, venue name search, empty result");
  await page.locator("#fold-map").click();
  check(
    await page
      .locator("#map-panel")
      .evaluate((e) => e.classList.contains("folded")),
    "map collapse",
  );
  await page.locator("#fold-map").click();
  await page.locator("#research").click();
  check(await page.locator("#sources-dialog").isVisible(), "sources dialog");
  await page.locator("#sources-dialog .dialog-close").click();
  await page.locator("#help").click();
  check(await page.locator("#help-dialog").isVisible(), "help dialog");
  await page.locator("#help-dialog .dialog-close").click();
  report.checks.push("Collapsible minimap, source and help dialogs");
  report.safeJumps = await page.evaluate(() =>
    window.__zoo.venues.map((v) => ({
      id: v.id,
      valid: window.__zoo.nav.ground(v.spawn.position) !== null,
      distance: v.spawn.distance,
    })),
  );
  check(
    report.safeJumps.every((j) => j.valid),
    "all venue jumps are on public safe ground",
  );
  await page.evaluate(() => window.__zoo.selectVenue("v-273416876"));
  await page.locator("#walk-here").click();
  check((await page.evaluate(() => window.__zoo.mode)) === "walk", "walk mode");
  const walkBefore = await page.evaluate(() =>
    window.__zoo.camera.position.toArray(),
  );
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyD");
  const walkAfter = await page.evaluate(() =>
    window.__zoo.camera.position.toArray(),
  );
  report.walk = { before: walkBefore, after: walkAfter };
  check(
    Math.hypot(walkAfter[0] - walkBefore[0], walkAfter[2] - walkBefore[2]) >
      0.2,
    "WASD motion",
  );
  check(Math.abs(walkAfter[1] - 1.82) < 0.02, "1.7m eye above .12m path");
  const safeMove = await page.evaluate(() => {
    const z = window.__zoo,
      p = z.move(100, 100);
    return { position: p, valid: z.nav.ground(p) !== null };
  });
  check(safeMove.valid, "large step collision");
  await page.screenshot({ path: "evidence/final-walk.png" });
  await page.mouse.click(800, 430);
  await page.waitForTimeout(200);
  report.pointerLock = await page.evaluate(() => !!document.pointerLockElement);
  if (report.pointerLock) {
    const prev = await page.evaluate(() => window.__zoo.yaw);
    await page.mouse.move(850, 445);
    check(
      Math.abs((await page.evaluate(() => window.__zoo.yaw)) - prev) > 0.001,
      "mouse look",
    );
    await page.keyboard.press("Escape");
  }
  report.checks.push(
    "Walk entry, WASD, eye height, conservative swept collision, pointer lock attempt",
  );
  await page.locator("#home").click();
  await page.waitForTimeout(1300);
  for (const q of ["low", "medium", "high"]) {
    await page.locator("#quality").selectOption(q);
    await page.waitForTimeout(1000);
    await page.evaluate(() => (window.__zoo.perf.samples.length = 0));
    await page.waitForTimeout(2200);
    const p = await page.evaluate(() => {
      const z = window.__zoo,
        a = [...z.perf.samples].sort((a, b) => a - b),
        avg = a.reduce((s, n) => s + n, 0) / a.length;
      return {
        quality: z.perf.quality,
        frames: a.length,
        meanFrameMs: avg,
        p95FrameMs: a[Math.floor(a.length * 0.95)],
        fps: 1000 / avg,
        drawCalls: z.renderer.info.render.calls,
        triangles: z.renderer.info.render.triangles,
        pixelRatio: z.renderer.getPixelRatio(),
      };
    });
    report.performance.push(p);
    check(
      (await page.evaluate(() => window.__zoo.venues.length)) === 54,
      "quality preserves venues",
    );
  }
  report.checks.push(
    "Three quality tiers with measured frame intervals and draw calls",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__zoo?.ready);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "evidence/final-mobile.png" });
  check(
    await page
      .locator("#explorer")
      .evaluate((e) => e.classList.contains("folded")),
    "mobile list starts folded",
  );
  await page.locator("#fold-list").click();
  await page.locator("#search").fill("大熊猫");
  await page.locator(".result[data-species]").click();
  check(
    (await page.locator("#info h2").textContent()).includes("熊猫"),
    "mobile search + jump",
  );
  await page.screenshot({ path: "evidence/final-mobile-detail.png" });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no mobile horizontal overflow",
  );
  report.checks.push(
    "390x844 mobile layout, query and venue jump (desktop viewport emulation)",
  );
  const degraded = await browser.newPage({
    viewport: { width: 1100, height: 760 },
  });
  await degraded.route("**/models/lion.glb", (r) => r.abort());
  await degraded.goto(base, { waitUntil: "networkidle" });
  await degraded.waitForFunction(() => window.__zoo?.ready, null, {
    timeout: 30000,
  });
  check(
    await degraded.locator("#resource-warning").isVisible(),
    "model failure notice",
  );
  check(
    await degraded.locator("#loading").isHidden(),
    "failure does not leave black loading screen",
  );
  await degraded.screenshot({ path: "evidence/final-resource-failure.png" });
  await degraded.close();
  report.checks.push(
    "Blocked model request produces usable scene and failure notice",
  );
  check(errors.length === 0, "console/page errors");
  check(requests.length === 0, "normal page request failures");
} catch (e) {
  failures.push(e.stack || e.message);
} finally {
  await fs.writeFile(
    "evidence/browser-results.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        checks: report.checks,
        failures,
        errors,
        failedRequests: requests,
        performance: report.performance,
      },
      null,
      2,
    ),
  );
}
if (failures.length) process.exit(1);
