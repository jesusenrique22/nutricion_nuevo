import { Suspense } from "react";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { PatientCartPanel } from "@/components/cart/patient-cart-panel";
import { getCartItems } from "@/server/actions/cart.actions";
import { getPaymentCheckoutPolicy } from "@/lib/payment-checkout-policy";

export const dynamic = "force-dynamic";

export default async function PatientCartPage() {
  const [items, checkoutPolicy] = await Promise.all([
    getCartItems(),
    getPaymentCheckoutPolicy(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <BrandDashboardHeader
        eyebrow="Tu pedido"
        title="Carrito"
        description="Agregá citas, recursos y paquetes; pagá todo en un solo pedido."
      />
      <Suspense
        fallback={
          <PatientCartPanel items={items} checkoutPolicy={checkoutPolicy} />
        }
      >
        <PatientCartPanel items={items} checkoutPolicy={checkoutPolicy} />
      </Suspense>
    </div>
  );
}
