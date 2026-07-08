import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getMyProductPurchaseStatuses } from "@/server/actions/cart.actions";
import { getProducts } from "@/server/queries/landing.queries";

export const dynamic = "force-dynamic";

export default async function PatientProductsPage() {
  const [products, purchaseStatuses] = await Promise.all([
    getProducts(),
    getMyProductPurchaseStatuses(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <BrandDashboardHeader
        eyebrow="Tienda"
        title={products.heading || "Productos"}
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
