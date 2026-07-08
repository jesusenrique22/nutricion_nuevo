import Link from "next/link";
import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { auth } from "@/lib/auth";
import { getProducts } from "@/server/queries/landing.queries";
import { getMyProductPurchaseStatuses } from "@/server/actions/cart.actions";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const session = await auth();
  const products = await getProducts();
  const isPatient = session?.user?.role === "PATIENT";
  const purchaseStatuses = isPatient ? await getMyProductPurchaseStatuses() : {};

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <ContentLobbyShell
          title={products.heading || "Productos"}
          description={products.subheading || undefined}
        >
          {!isPatient && (
            <p className="mb-6 rounded-xl bg-accent/10 px-4 py-3 text-sm">
              <Link href="/login" className="font-semibold text-primary">
                Iniciá sesión
              </Link>{" "}
              como paciente para agregar productos al carrito y completar la
              compra.
            </p>
          )}
          <ProductCatalog
            data={products}
            canPurchase={isPatient}
            purchaseStatuses={purchaseStatuses}
          />
        </ContentLobbyShell>
      </div>
    </div>
  );
}
