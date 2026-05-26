import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  const testEmail = "test@mail.com";
  const testPassword = "1234567";

  test("Login with existing user and see dashboard", async ({ page }) => {
    // 1. Go to auth page
    await page.goto("http://localhost:5173/auth");

    // 2. Make sure we're on login (try to click "Inicia sesión" if visible)
    try {
      await page.click('button:has-text("Inicia sesión")', { timeout: 1000 });
    } catch {
      // Already on login
    }

    // 3. Wait for login form
    await page.waitForSelector('input[placeholder="tu@email.com"]');

    // 4. Fill login form
    await page.fill('input[placeholder="tu@email.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);

    // 5. Submit
    await page.getByRole("button", { name: "Entrar" }).click();

    // 6. Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // 7. Profile should be loaded (name visible)
    // Adjust this based on what name is actually stored for test@mail.com
    await expect(page.locator("text=Hola")).toBeVisible({ timeout: 5000 });
  });

  test("Login with non-existing user should show error", async ({ page }) => {
    await page.goto("http://localhost:5173/auth");
    try {
      await page.click('button:has-text("Inicia sesión")', { timeout: 1000 });
    } catch {}
    await page.waitForSelector('input[placeholder="tu@email.com"]');
    await page.fill(
      'input[placeholder="tu@email.com"]',
      "nonexistent@mail.com",
    );
    await page.fill('input[placeholder="••••••••"]', "wrongpassword");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({
      timeout: 5000,
    });
  });
});
