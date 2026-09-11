import { test, expect } from "./helpers/fixtures";
import { assertHealthyPage, gotoApp } from "./helpers/auth";
import { PUBLIC_ROUTES } from "./helpers/routes";

test.describe("Cliente público (sin login)", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`carga ${route.path}`, async ({ page }) => {
      const response = await gotoApp(page, route.path);
      const status = response?.status() ?? 0;
      expect(status).toBeLessThan(500);
      // Tienda u otras páginas CMS pueden estar despublicadas (404).
      if (status === 404) return;
      await assertHealthyPage(page);
    });
  }

  test("formulario de login está operativo", async ({ page }) => {
    await gotoApp(page, "/login");
    await page.locator('input[name="email"]').fill("cliente@ejemplo.com");
    await page.locator('input[name="password"]').fill("demo");
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();
    await expect(page.getByRole("link", { name: /registrate/i })).toBeVisible();
  });

  test("registro muestra formulario", async ({ page }) => {
    await gotoApp(page, "/register");
    await assertHealthyPage(page);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("landing tiene enlaces de navegación", async ({ page }) => {
    await gotoApp(page, "/");
    await assertHealthyPage(page);
    await expect(
      page.getByRole("link", { name: /iniciar sesión|ingresar|login/i }).first(),
    ).toBeVisible();
  });
});
