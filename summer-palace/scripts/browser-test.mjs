import { chromium } from "playwright";
import fs from "node:fs";
const base = process.env.TEST_URL || "http://127.0.0.1:5183/";
const executablePath =
  process.env.CHROMIUM_PATH ||
  "C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
fs.mkdirSync("evidence", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const errors = [],
  failures = [],
  requests = [];
const assert = (v, message) => {
  if (!v) failures.push(message);
};
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) =>
  requests.push({ url: r.url(), error: r.failure()?.errorText }),
);
page.on("response", (r) => {
  if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() });
});
const report = {
  date: new Date().toISOString(),
  url: base,
  viewport: { width: 1440, height: 960, dpr: 1 },
  browser: await browser.version(),
  mode: "headless Chromium, hardware WebGL; isolated local test",
  errors,
  failedRequests: requests,
  failures,
  checks: [],
  performance: [],
};
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__summer?.ready, null, {
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  report.scene = await page.evaluate(() => {
    const s = window.__summer,
      g = s.renderer.getContext(),
      ext = g.getExtension("WEBGL_debug_renderer_info");
    return {
      gpu: ext
        ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : g.getParameter(g.RENDERER),
      buildings: s.models.length,
      trees: s.trees.count,
      waterAreas: s.data.water.length,
      bridges: s.ground.bridges.map((b) => ({
        name: b.name,
        arches: b.arches,
        length: b.length,
      })),
      stairs: s.extra.stairs.length,
      gardenGalleryBays: s.garden.galleryBays,
    };
  });
  await page.screenshot({ path: "evidence/final-lake.png" });
  await page.locator("#home").click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "evidence/final-overview.png" });
  report.checks.push("Load, reset overview");
  await page.locator("#research").click();
  assert(await page.locator("#sources").isVisible(), "sources dialog");
  await page.locator("#sources .dialog-close").click();
  await page.locator("#help").click();
  assert(await page.locator("#instructions").isVisible(), "help dialog");
  await page.locator("#instructions .dialog-close").click();
  report.checks.push("Reference and help dialogs");
  await page.locator("#fold-map").click();
  assert(
    await page
      .locator("#map-panel")
      .evaluate((e) => e.classList.contains("folded")),
    "fold map",
  );
  await page.locator("#fold-map").click();
  report.checks.push("Collapsible minimap");
  const orbitBefore = await page.evaluate(() =>
    window.__summer.camera.position.toArray(),
  );
  await page.mouse.move(850, 390);
  await page.mouse.down();
  await page.mouse.move(960, 430, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  assert(
    (await page.evaluate(() => window.__summer.camera.position.toArray())).some(
      (v, i) => Math.abs(v - orbitBefore[i]) > 0.5,
    ),
    "orbit rotate",
  );
  await page.mouse.wheel(0, -240);
  report.checks.push("Mouse orbit and zoom");
  const ids = await page
    .locator("[data-place]")
    .evaluateAll((es) => es.map((e) => e.dataset.place));
  report.safeJumps = [];
  for (const id of ids) {
    await page.locator(`[data-place="${id}"]`).click();
    assert(await page.locator("#info").isVisible(), `info ${id}`);
    await page.locator("#close-info").click();
    await page.waitForTimeout(180);
    if (
      [
        "foxiang",
        "bridge",
        "corridor",
        "boat",
        "xiequ",
        "suzhou",
        "renshou",
        "west-dyke",
      ].includes(id)
    )
      await page.screenshot({ path: `evidence/final-${id}.png` });
    const spawn = await page.evaluate((id) => {
      const s = window.__summer,
        b = s.sites.find((b) => b.id === id),
        p = s.nav.safePoint(...(b.spawn || [b.x, b.z + (b.d || 20) / 2 + 16]));
      return {
        id,
        p,
        y: s.ground.height(...p),
        safe: s.nav.canStand(...p, 0, false),
        water: !!s.ground.waterAt(...p),
        bridge: !!s.ground.bridgeAt(...p),
      };
    }, id);
    report.safeJumps.push(spawn);
    assert(spawn.safe, `safe jump ${id}`);
  }
  report.checks.push(`${ids.length} landmark jumps and introductions`);
  const mapPoint = await page.evaluate(() => {
    const c = document.getElementById("map"),
      r = c.getBoundingClientRect(),
      s = window.__summer.sites.find((b) => b.id === "foxiang"),
      scale = Math.min(284 / 2140, 284 / 2450),
      x = 150 - ((-1750 + 390) / 2) * scale + s.x * scale,
      z = 150 - ((-1280 + 1170) / 2) * scale + s.z * scale;
    return { x: r.left + (x / 300) * r.width, y: r.top + (z / 300) * r.height };
  });
  await page.mouse.click(mapPoint.x, mapPoint.y);
  assert(
    await page.evaluate(() => window.__summer.nav.selected?.id === "foxiang"),
    "minimap jump",
  );
  await page.locator("#close-info").click();
  report.checks.push("Minimap landmark click");
  await page.locator("#quality").selectOption("low");
  await page.locator('[data-place="renshou"]').click();
  await page.locator("#close-info").click();
  await page.waitForTimeout(350);
  const pick = await page.evaluate(() => {
    const s = window.__summer,
      b = s.models.find((b) => b.id === "renshou"),
      v = s.nav.orbit.target
        .clone()
        .set(b.x, b.base + b.h * 0.4, b.z)
        .project(s.camera);
    return {
      x: ((v.x + 1) * innerWidth) / 2,
      y: ((1 - v.y) * innerHeight) / 2,
    };
  });
  await page.mouse.click(pick.x, pick.y);
  assert(await page.locator("#info").isVisible(), "3D batched building click");
  assert(
    (await page.locator("#info-name").textContent()) === "仁寿殿",
    "picked building identity",
  );
  await page.locator("#close-info").click();
  await page.locator("#quality").selectOption("medium");
  report.checks.push("Batched 3D building picking");
  report.routes = await page.evaluate(() => {
    const s = window.__summer;
    function sample(name, points, width = 0.1) {
      const blocked = [];
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / width);
        let prev = s.ground.height(...a);
        for (let k = 0; k <= n; k++) {
          const t = k / n,
            x = a[0] + (b[0] - a[0]) * t,
            z = a[1] + (b[1] - a[1]) * t,
            h = s.ground.height(x, z);
          if (!s.nav.canStand(x, z, prev, true) && blocked.length < 20)
            blocked.push({ x, z, h, prev, water: !!s.ground.waterAt(x, z) });
          prev = h;
        }
        length += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      return { name, length, blocked };
    }
    const bridge = s.ground.bridges.find((b) => b.id === "bridge"),
      routes = [
        sample("长廊 728m", s.corridor.points),
        sample("十七孔桥 150m", [bridge.a, bridge.b]),
      ];
    for (const stair of s.extra.stairs.filter((p) => p.name === "佛香阁侧阶"))
      routes.push(sample(stair.name, [stair.a, stair.b]));
    const gang = s.ground.bridges.find((b) => b.name === "石舫登舫桥");
    routes.push(sample("石舫登舫桥", [gang.a, gang.b]));
    const openWater = [-500, -300],
      hall = s.models.find((b) => b.id === "renshou");
    const tests = {
      waterBlocked: !s.nav.canStand(...openWater, 0, false),
      hallBlocked: !s.nav.canStand(hall.x, hall.z, 0, false),
      bridgeGroundSeparated:
        s.ground.terrainHeight(
          (bridge.a[0] + bridge.b[0]) / 2,
          (bridge.a[1] + bridge.b[1]) / 2,
        ) < -0.5,
    };
    return { routes, tests };
  });
  for (const route of report.routes.routes)
    assert(
      route.blocked.length === 0,
      `${route.name}: blocked ${route.blocked.length}`,
    );
  for (const [name, value] of Object.entries(report.routes.tests))
    assert(value, name);
  report.checks.push(
    "Water and wall collision; bridge deck separate from lake bed; sampled continuous routes at 0.1m",
  );
  await page.locator('[data-place="corridor"]').click();
  await page.locator("#enter-walk").click();
  await page.waitForTimeout(250);
  const p0 = await page.evaluate(() =>
    window.__summer.camera.position.toArray(),
  );
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyW");
  const p1 = await page.evaluate(() => {
    const s = window.__summer;
    return {
      p: s.camera.position.toArray(),
      height:
        s.camera.position.y -
        s.ground.height(s.camera.position.x, s.camera.position.z),
      mode: s.nav.mode,
    };
  });
  assert(
    Math.hypot(p1.p[0] - p0[0], p1.p[2] - p0[2]) > 0.3,
    "WASD input moves camera",
  );
  assert(Math.abs(p1.height - 1.7) < 0.001, "eye height 1.7m");
  report.walkInput = { p0, ...p1 };
  await page.screenshot({ path: "evidence/final-walk-corridor.png" });
  await page.mouse.move(700, 400);
  await page.mouse.down();
  await page.mouse.move(840, 420, { steps: 10 });
  await page.mouse.up();
  report.checks.push("WASD, held mouse look, 1.7m ground-following camera");
  await page.locator("#tour").click();
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.__summer.nav.auto), "tour starts");
  await page.locator("#tour").click();
  assert(!(await page.evaluate(() => window.__summer.nav.auto)), "tour stops");
  report.checks.push("Corridor guided walk starts and stops");
  await page.locator("#orbit").click();
  await page.locator('[data-place="foxiang"]').click();
  await page.locator("#close-info").click();
  for (const quality of ["low", "medium", "high"]) {
    await page.locator("#quality").selectOption(quality);
    await page.waitForTimeout(700);
    assert(
      await page.evaluate((q) => window.__summer.quality() === q, quality),
      `quality ${quality}`,
    );
    const perf = await page.evaluate(async () => {
      const times = [];
      let previous = performance.now();
      await new Promise((resolve) => {
        const start = performance.now();
        function frame(now) {
          times.push(now - previous);
          previous = now;
          if (now - start < 3500) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      times.shift();
      times.sort((a, b) => a - b);
      const s = window.__summer,
        mean = times.reduce((a, b) => a + b, 0) / times.length;
      return {
        sampleFrames: times.length,
        seconds: 3.5,
        meanFrameMs: +mean.toFixed(2),
        observedRafFps: +(1000 / mean).toFixed(1),
        p95FrameMs: +times[Math.floor(times.length * 0.95)].toFixed(2),
        drawCalls: s.renderer.info.render.calls,
        triangles: s.renderer.info.render.triangles,
        textureCount: s.renderer.info.memory.textures,
        geometries: s.renderer.info.memory.geometries,
        pixelRatio: s.renderer.getPixelRatio(),
      };
    });
    report.performance.push({ quality, view: "佛香阁近景", ...perf });
  }
  await page.locator("#quality").selectOption("medium");
  await page.locator("#home").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert(
    await page.evaluate(
      () => Math.abs(window.__summer.camera.aspect - 390 / 844) < 0.001,
    ),
    "resize camera",
  );
  await page.locator("#fold-places").click();
  await page.locator("#fold-map").click();
  await page.screenshot({ path: "evidence/final-mobile.png" });
  report.checks.push("390×844 responsive layout and collapsed controls");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  mobile.on("pageerror", (e) => errors.push("mobile: " + e.message));
  await mobile.goto(base);
  await mobile.waitForFunction(() => window.__summer?.ready, null, {
    timeout: 90000,
  });
  await mobile.locator("#fold-places").click();
  await mobile.locator("#fold-map").click();
  const before = await mobile.evaluate(() =>
    window.__summer.camera.position.distanceTo(
      window.__summer.nav.orbit.target,
    ),
  );
  const client = await mobileContext.newCDPSession(mobile);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 190, y: 340, id: 1 },
      { x: 270, y: 410, id: 2 },
    ],
  });
  for (let i = 1; i <= 10; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 190 - i * 3, y: 340 - i * 3, id: 1 },
        { x: 270 + i * 3, y: 410 + i * 3, id: 2 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await mobile.waitForTimeout(350);
  const after = await mobile.evaluate(() =>
    window.__summer.camera.position.distanceTo(
      window.__summer.nav.orbit.target,
    ),
  );
  assert(Math.abs(after - before) > 2, "mobile pinch zoom");
  await mobile.locator("#fold-places").click();
  await mobile.locator('[data-place="bridge"]').tap();
  assert(
    await mobile.evaluate(() => window.__summer.nav.selected?.id === "bridge"),
    "mobile landmark tap",
  );
  await mobile.locator("#close-info").tap();
  await mobile.locator("#fold-places").tap();
  await mobile.screenshot({ path: "evidence/final-touch-mobile.png" });
  report.mobileTouch = {
    beforeDistance: before,
    afterDistance: after,
    dpr: 2,
    viewport: "390×844",
    pinch: Math.abs(after - before) > 2,
  };
  await mobileContext.close();
  report.checks.push("Touch device emulation: pinch zoom and landmark tap");
  const source = await page.request.get(`${base}data/sources.json`);
  assert(source.ok(), "source manifest loads");
  assert(errors.length === 0, "no console/page errors");
  assert(requests.length === 0, "no failed resources");
} catch (e) {
  failures.push(e.stack || e.message);
} finally {
  fs.writeFileSync(
    "evidence/browser-results.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
