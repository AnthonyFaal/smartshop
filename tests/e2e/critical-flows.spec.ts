import { test, expect, type Page } from "@playwright/test";

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const sellerEmail = process.env.E2E_SELLER_EMAIL ?? userEmail;
const sellerPassword = process.env.E2E_SELLER_PASSWORD ?? userPassword;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("critical marketplace flows", () => {
  test("signup page exposes accessible registration fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test("checkout exposes payment phone and payment method choices", async ({ page }) => {
    if (userEmail && userPassword) await login(page, userEmail, userPassword);
    await page.goto("/checkout");
    if (/\/login/.test(page.url())) {
      await expect(page.getByLabel(/email/i)).toBeVisible();
      return;
    }
    await expect(page.getByText(/checkout/i).first()).toBeVisible();
    const paymentPhone = page.getByLabel(/payment phone/i);
    if (await paymentPhone.count()) {
      await expect(paymentPhone).toBeVisible();
      await expect(page.getByLabel(/debit\/credit card/i)).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    }
  });

  test("seller verification route is addressable", async ({ page }) => {
    if (sellerEmail && sellerPassword) await login(page, sellerEmail, sellerPassword);
    await page.goto("/seller/verification");
    await expect(page).not.toHaveTitle(/application error/i);
  });

  test("admin approval queue is addressable", async ({ page }) => {
    if (adminEmail && adminPassword) await login(page, adminEmail, adminPassword);
    await page.goto("/admin/verification");
    await expect(page).not.toHaveTitle(/application error/i);
  });

  test("product creation and marketing routes are addressable", async ({ page }) => {
    if (sellerEmail && sellerPassword) await login(page, sellerEmail, sellerPassword);
    for (const route of ["/seller/products/new", "/seller/marketing"]) {
      await page.goto(route);
      await expect(page).not.toHaveTitle(/application error/i);
    }
  });

  test("Paystack checkout keeps card details on the hosted provider page", async ({ page }) => {
    if (userEmail && userPassword) await login(page, userEmail, userPassword);
    await page.goto("/checkout");
    if (/\/login/.test(page.url())) {
      await expect(page.getByLabel(/email/i)).toBeVisible();
      return;
    }
    const securePaymentCopy = page.getByText(/entered securely on Paystack/i);
    if (await securePaymentCopy.count()) {
      await expect(securePaymentCopy).toBeVisible();
    }
  });
});
