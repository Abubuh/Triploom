import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  const testEmail = "test@mail.com";
  const testPassword = "1234567";

  test("Login with existing user and see dashboard", async ({ page }) => {
    await page.goto("/auth");

    try {
      await page.click('button:has-text("Iniciar sesión")', { timeout: 1000 });
    } catch {}

    await page.waitForSelector('input[placeholder="tu@correo.com"]');
    await page.fill('input[placeholder="tu@correo.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    await page.getByRole("button", { name: "Entrar a Triploom" }).click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("Login with non-existing user should show error", async ({ page }) => {
    await page.goto("/auth");
    try {
      await page.click('button:has-text("Iniciar sesión")', { timeout: 1000 });
    } catch {}
    await page.waitForSelector('input[placeholder="tu@correo.com"]');
    await page.fill('input[placeholder="tu@correo.com"]', "nonexistent@mail.com");
    await page.fill('input[placeholder="••••••••"]', "wrongpassword");
    await page.getByRole("button", { name: "Entrar a Triploom" }).click();
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({
      timeout: 5000,
    });
  });
});
