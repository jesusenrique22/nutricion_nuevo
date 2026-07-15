import type { NavMenuData } from "@/types/nav-menu";
import type { ProductsData } from "@/types/products";

/** Si la tienda debe verse para pacientes / público (respeta menú + productos activos). */
export function isStoreVisible(
  navMenu: NavMenuData,
  products: ProductsData,
): boolean {
  const storeNav = navMenu.items.find(
    (item) => item.type === "page" && item.target === "/productos",
  );
  const hasEnabledProducts = products.items.some((item) => item.enabled);
  if (!hasEnabledProducts) return false;
  if (storeNav != null) return storeNav.enabled;
  return true;
}

export function storeNavLabel(navMenu: NavMenuData): string {
  const storeNav = navMenu.items.find(
    (item) => item.type === "page" && item.target === "/productos",
  );
  return storeNav?.label?.trim() || "Tienda";
}
