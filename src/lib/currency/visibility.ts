/** Rutas de auth: sin selector de moneda (no hay precios). */
const AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/check-email",
]);

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

/** Lobby y catálogo público con precios visibles. */
export function showsPublicCurrencySelector(pathname: string): boolean {
  if (isAuthRoute(pathname)) return false;
  return (
    pathname === "/" ||
    pathname === "/resources" ||
    pathname.startsWith("/resources/")
  );
}

/** Panel logueado: sidebar con moneda en todo el dashboard. */
export function showsDashboardCurrencySelector(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}
