import { test, expect } from "./helpers/fixtures";
import {
  assertHealthyPage,
  gotoApp,
  hasPatientCredentials,
  loginAs,
} from "./helpers/auth";
import { PATIENT_ROUTES } from "./helpers/routes";

test.describe("Paciente — recorrido completo", () => {
  test.skip(!hasPatientCredentials(), "Define E2E_PATIENT_EMAIL y E2E_PATIENT_PASSWORD en .env");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "patient");
  });

  for (const route of PATIENT_ROUTES) {
    test(`panel: ${route.label} (${route.path})`, async ({ page }) => {
      const response = await gotoApp(page, route.path);
      const status = response?.status() ?? 0;
      expect(status).toBeLessThan(500);
      if (status === 404) return;
      await assertHealthyPage(page);
      await expect(page.locator("main")).toBeVisible();
    });
  }

  test("sidebar navega entre secciones", async ({ page }) => {
    await gotoApp(page, "/dashboard");
    await page.getByRole("link", { name: "Mis citas", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/patient\/appointments/);
    await assertHealthyPage(page);

    await page.getByRole("link", { name: "Carrito", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/patient\/cart/);
    await assertHealthyPage(page);
  });

  test("carrito muestra UI de checkout o vacío", async ({ page }) => {
    await gotoApp(page, "/dashboard/patient/cart");
    await assertHealthyPage(page);
    const body = page.locator("main");
    await expect(body).toBeVisible();
    const text = (await body.innerText()).toLowerCase();
    expect(
      text.includes("carrito") ||
        text.includes("vacío") ||
        text.includes("checkout") ||
        text.includes("cupón"),
    ).toBeTruthy();
  });

  test("notificaciones carga lista", async ({ page }) => {
    await gotoApp(page, "/dashboard/notifications");
    await assertHealthyPage(page);
    await expect(
      page.getByText(/notificaciones|no tienes notificaciones/i),
    ).toBeVisible();
  });
});
