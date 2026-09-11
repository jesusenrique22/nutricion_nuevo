import { test as base, expect } from "@playwright/test";

/** Bloquea media GridFS (lento/offline con VPN) — el bot prueba flujos, no imágenes. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/\/api\/media\//, (route) => route.abort());
    await use(page);
  },
});

export { expect };
