import { redirect } from "next/navigation";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { isStoreVisible, storeNavLabel } from "@/lib/store-visibility";
import { getMyProductPurchaseStatuses } from "@/server/actions/cart.actions";
import { getNavMenu, getProducts } from "@/server/queries/landing.queries";

export const dynamic = "force-dynamic";

export default async function PatientProductsPage() {
  const [products, purchaseStatuses, navMenu] = await Promise.all([
    getProducts(),
    getMyProductPurchaseStatuses(),
    getNavMenu(),
  ]);

  if (!isStoreVisible(navMenu, products)) {
    redirect("/dashboard/patient/cart");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <BrandDashboardHeader
        eyebrow={storeNavLabel(navMenu)}
        title={products.heading || "Tienda"}
        description={
          products.subheading ||
          "Productos y materiales recomendados por Anttova. Agregalos al carrito para comprar."
        }
      />

      <ProductCatalog
        data={products}
        canPurchase
        purchaseStatuses={purchaseStatuses}
      />
    </div>
  );
}
