import { Suspense } from "react";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
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
    <DashboardPage className="space-y-8">
      <BrandDashboardHeader
        eyebrow="Tu pedido"
        title="Carrito"
        description="Revisá cada producto con su foto y cantidad antes de confirmar tu compra."
      />
      <Suspense
        fallback={
          <PatientCartPanel items={items} checkoutPolicy={checkoutPolicy} />
        }
      >
        <PatientCartPanel items={items} checkoutPolicy={checkoutPolicy} />
      </Suspense>
    </DashboardPage>
  );
}
