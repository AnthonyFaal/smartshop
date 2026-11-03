import { mkdir, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const outputDir = new URL("../docs/assets/", import.meta.url);
const rawDir = new URL("../.demo-recording/", import.meta.url);

await mkdir(outputDir, { recursive: true });
await rm(rawDir, { recursive: true, force: true });
await mkdir(rawDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: fileURLToPath(rawDir), size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const pause = (milliseconds) => page.waitForTimeout(milliseconds);

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2500);
  await page.screenshot({ path: fileURLToPath(new URL("home.png", outputDir)), fullPage: true });

  await page.goto(`${baseUrl}/marketplace`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(1800);
  await page.screenshot({ path: fileURLToPath(new URL("marketplace.png", outputDir)), fullPage: true });
  const firstProduct = page.locator('a[href^="/products/"]').first();
  if (await firstProduct.count()) {
    await firstProduct.click();
    await page.waitForLoadState("domcontentloaded");
    await pause(2200);
    await page.screenshot({ path: fileURLToPath(new URL("buyer-product.png", outputDir)), fullPage: true });
  }

  await page.goto(`${baseUrl}/login?redirect=/seller`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.getByLabel(/email/i).fill("seller@smartshop.gh");
  await page.getByRole("textbox", { name: "Password" }).fill("Seller123!");
  await page.getByRole("main").getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL(/\/seller/, { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
  await pause(2500);
  await page.screenshot({ path: fileURLToPath(new URL("seller-dashboard.png", outputDir)), fullPage: true });

  await page.goto(`${baseUrl}/seller/products`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2200);
  await page.goto(`${baseUrl}/seller/inventory`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2200);
  await page.screenshot({ path: fileURLToPath(new URL("seller-inventory.png", outputDir)), fullPage: true });
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  if (!video) throw new Error("Playwright did not create a recording.");
  await rename(await video.path(), fileURLToPath(new URL("demo.webm", outputDir)));
  await rm(rawDir, { recursive: true, force: true });
}
