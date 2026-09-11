import { expect, type Page } from "@playwright/test";

export async function gotoApp(page: Page, path: string) {
  return page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

export type Role = "patient" | "admin";

function creds(role: Role) {
  if (role === "admin") {
    const email = process.env.E2E_ADMIN_EMAIL?.trim();
    const password = process.env.E2E_ADMIN_PASSWORD?.trim();
    if (email && password) return { email, password };
    if (process.env.E2E_USE_SEED_ADMIN === "1") {
      return { email: "admin@gmail.com", password: "Admin123!" };
    }
    return { email: "", password: "" };
  }
  return {
    email: process.env.E2E_PATIENT_EMAIL?.trim() || "",
    password: process.env.E2E_PATIENT_PASSWORD?.trim() || "",
  };
}

export function hasPatientCredentials(): boolean {
  const { email, password } = creds("patient");
  return Boolean(email && password);
}

export function hasAdminCredentials(): boolean {
  const { email, password } = creds("admin");
  return Boolean(email && password);
}

export async function loginAs(page: Page, role: Role) {
  const { email, password } = creds(role);
  if (!email || !password) {
    throw new Error(
      role === "patient"
        ? "Faltan E2E_PATIENT_EMAIL y E2E_PATIENT_PASSWORD en .env"
        : "Faltan credenciales admin para E2E",
    );
  }

  await gotoApp(page, "/login");
  await page.locator('input[name="email"]').waitFor();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard/, {
      timeout: 45_000,
      waitUntil: "domcontentloaded",
    }),
    page.getByRole("button", { name: /iniciar sesión/i }).click(),
  ]);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function assertHealthyPage(page: Page) {
  await expect(page.locator("body")).not.toContainText(
    "Application error: a client-side exception has occurred",
  );
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
}
