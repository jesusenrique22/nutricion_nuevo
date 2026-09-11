import { test, expect } from "./helpers/fixtures";
import {
  assertHealthyPage,
  gotoApp,
  hasAdminCredentials,
  loginAs,
} from "./helpers/auth";
import { ADMIN_ROUTES } from "./helpers/routes";

test.describe("Admin — smoke de panel", () => {
  test.skip(
    !hasAdminCredentials(),
    "Define E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD, o E2E_USE_SEED_ADMIN=1 con db seed",
  );

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  for (const route of ADMIN_ROUTES) {
    test(`admin: ${route.label} (${route.path})`, async ({ page }) => {
      const response = await gotoApp(page, route.path);
      expect(response?.status()).toBeLessThan(500);
      await assertHealthyPage(page);
      await expect(page.locator("main")).toBeVisible();
    });
  }
});
