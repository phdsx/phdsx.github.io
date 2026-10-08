import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    "C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on("pageerror", (e) => console.log("ERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log(m.text());
});
await fs.mkdir("evidence", { recursive: true });
await page.goto(process.env.TEST_URL || "http://127.0.0.1:5185/", {
  waitUntil: "networkidle",
});
await page.waitForFunction(() => window.__zoo?.ready, null, { timeout: 90000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: "evidence/gate.png" });
console.log(
  await page.evaluate(() => ({
    trees: window.__zoo.world.treeCount,
    perf: window.__zoo.perf,
    lion: window.__zoo.world.animalStatus,
  })),
);
await page.locator("#home").click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "evidence/overview.png" });
await page.evaluate(() => window.__zoo.selectVenue("v-273416876"));
await page.locator("#near-view").click();
await page.locator("#close-info").click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "evidence/lion.png" });
await browser.close();
