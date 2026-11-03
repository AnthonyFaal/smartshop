import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const outputDir = new URL("../docs/assets/", import.meta.url);

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const pause = (milliseconds) => page.waitForTimeout(milliseconds);

try {
  console.log("Capturing public pages from", baseUrl);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2500);
  await page.screenshot({ path: fileURLToPath(new URL("home.png", outputDir)), fullPage: true });

  await page.goto(`${baseUrl}/marketplace`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(1800);
  await page.screenshot({ path: fileURLToPath(new URL("marketplace.png", outputDir)), fullPage: true });
  const firstProduct = page.locator('a[href^="/products/"]').first();
  if (await firstProduct.count()) {
    const productTitle = (await firstProduct.locator("h3").innerText()).trim();
    await firstProduct.click();
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("heading", { level: 1, name: productTitle }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await page.locator(`main img[alt=${JSON.stringify(productTitle)}]`).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await page.waitForFunction(
      (title) => Array.from(document.querySelectorAll("main img")).some(
        (image) => image.alt === title && image.complete && image.naturalWidth > 0
      ),
      productTitle,
      { timeout: 15_000 }
    );
    await pause(500);
    await page.screenshot({ path: fileURLToPath(new URL("buyer-product.png", outputDir)), fullPage: true });
  }

  await page.goto(`${baseUrl}/login?redirect=/admin`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  console.log("Signing in with the seeded administrator account");
  await page.getByLabel(/email/i).fill("admin@smartshop.gh");
  await page.getByRole("textbox", { name: "Password" }).fill("Adminlan!");
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/admin", { timeout: 15_000 }),
    page.getByRole("main").getByRole("button", { name: /sign in|login/i }).click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await pause(2500);
  await page.screenshot({ path: fileURLToPath(new URL("admin-dashboard.png", outputDir)), fullPage: true });
  console.log("Captured admin dashboard");

  await page.goto(`${baseUrl}/admin/operations`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2200);
  await page.screenshot({ path: fileURLToPath(new URL("admin-operations.png", outputDir)), fullPage: true });
  console.log("Captured admin operations");

  await page.goto(`${baseUrl}/admin/subscriptions`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await pause(2200);
  await page.screenshot({ path: fileURLToPath(new URL("admin-subscriptions.png", outputDir)), fullPage: true });
  console.log("Captured admin subscriptions");
} finally {
  await context.close();
  await browser.close();
  console.log("Screenshot capture complete");
}
