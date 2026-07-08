"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CartLineItem,
  cartItemsTotal,
} from "@/components/cart/cart-line-item";
import { PaymentMethodsCard } from "@/components/cart/payment-methods-card";
import { useDisplayPrice } from "@/components/currency/display-price";
import { submitCart, type CartItemDTO } from "@/server/actions/cart.actions";
import type { PaymentCheckoutPolicy } from "@/types/payment-checkout-policy";
import type { PaymentMethodId } from "@/lib/payment-methods";

function groupItems(items: CartItemDTO[]) {
  const products = items.filter((i) => i.type === "PRODUCT");
  const resources = items.filter((i) => i.type === "RESOURCE");
  const appointments = items.filter((i) => i.type === "APPOINTMENT");
  return { products, resources, appointments };
}

function CartSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">
        {title}{" "}
        <span className="font-normal text-foreground/45">({count})</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function PatientCartPanel({
  items,
  checkoutPolicy,
}: {
  items: CartItemDTO[];
  checkoutPolicy: PaymentCheckoutPolicy;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentAdded = searchParams.get("cita") === "agregada";
  const { convert, displayCurrency } = useDisplayPrice();
  const [isPending, startTransition] = useTransition();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(
    null,
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const grouped = useMemo(() => groupItems(items), [items]);

  const hasPaidItems = useMemo(
    () => items.some((i) => i.price && Number(i.price) > 0),
    [items],
  );

  const totals = useMemo(
    () => cartItemsTotal(items, convert, displayCurrency),
    [items, convert, displayCurrency],
  );

  const missingFields = useMemo(() => {
    if (!hasPaidItems) return [];
    const missing: string[] = [];
    if (!paymentMethod) missing.push("modo de pago");
    if (!paymentReference.trim()) {
      missing.push(checkoutPolicy.referenceLabel.toLowerCase());
    }
    if (proofUrls.length === 0) missing.push("captura del comprobante");
    return missing;
  }, [
    hasPaidItems,
    paymentMethod,
    paymentReference,
    proofUrls,
    checkoutPolicy.referenceLabel,
  ]);

  const isCheckoutComplete = missingFields.length === 0;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-foreground/15 bg-muted/20 px-6 py-14 text-center">
        <p className="text-base font-semibold text-foreground/70">
          Tu carrito está vacío
        </p>
        <p className="mt-2 text-sm text-foreground/50">
          Explorá productos, recursos o agendá una cita para empezar tu pedido.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/patient/products"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ver productos
          </Link>
          <Link
            href="/dashboard/patient/appointments"
            className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold hover:bg-muted/50"
          >
            Agendar cita
          </Link>
        </div>
      </div>
    );
  }

  function resetCheckoutForm() {
    setPaymentMethod(null);
    setPaymentReference("");
    setProofUrls([]);
    setPaymentNote("");
    setSubmitError(null);
  }

  function handleConfirmPurchase() {
    setSubmitError(null);

    if (hasPaidItems && missingFields.length > 0) {
      setSubmitError(`Falta completar: ${missingFields.join(", ")}.`);
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitCart({
          paymentMethod: paymentMethod ?? undefined,
          paymentReference: paymentReference.trim() || undefined,
          paymentProofUrls: proofUrls.length > 0 ? proofUrls : undefined,
          paymentNote: paymentNote.trim() || undefined,
        });
        if (res.ok) {
          router.push("/dashboard/patient/progress?pedido=ok");
          router.refresh();
        } else {
          setSubmitError(res.message);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "No se pudo confirmar el pedido. Intentá de nuevo en unos segundos.",
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-8">
        {appointmentAdded && (
          <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
            Cita agregada al carrito. Podés seguir comprando o confirmar el
            pedido cuando quieras.
          </p>
        )}

        <CartSection
          title="Productos"
          count={grouped.products.reduce((s, i) => s + i.quantity, 0)}
        >
          {grouped.products.map((item) => (
            <CartLineItem key={item.id} item={item} disabled={isPending} />
          ))}
        </CartSection>

        <CartSection title="Recursos" count={grouped.resources.length}>
          {grouped.resources.map((item) => (
            <CartLineItem key={item.id} item={item} disabled={isPending} />
          ))}
        </CartSection>

        <CartSection title="Citas" count={grouped.appointments.length}>
          {grouped.appointments.map((item) => (
            <CartLineItem key={item.id} item={item} disabled={isPending} />
          ))}
        </CartSection>

        {!checkoutOpen ? (
          <div className="flex flex-wrap gap-3 lg:hidden">
            <Link
              href="/dashboard/patient/products"
              className="text-sm font-semibold text-primary hover:underline"
            >
              + Seguir comprando
            </Link>
            <Link
              href="/dashboard/patient/appointments"
              className="text-sm font-semibold text-primary hover:underline"
            >
              + Agregar cita
            </Link>
          </div>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Resumen del pedido</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/55">
                Productos (
                {grouped.products.reduce((s, i) => s + i.quantity, 0)})
              </dt>
              <dd className="font-medium">{grouped.products.length} líneas</dd>
            </div>
            {grouped.resources.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/55">Recursos</dt>
                <dd className="font-medium">{grouped.resources.length}</dd>
              </div>
            )}
            {grouped.appointments.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/55">Citas</dt>
                <dd className="font-medium">{grouped.appointments.length}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-foreground/10 pt-3">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="text-2xl font-bold tabular-nums text-primary">
                {totals.label}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-foreground/45">
            {totals.units} {totals.units === 1 ? "unidad" : "unidades"} · en{" "}
            {displayCurrency === "USD" ? "dólares" : "pesos"}
          </p>

          {!checkoutOpen ? (
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setCheckoutOpen(true)}
                className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Proceder al pago
              </button>
              <p className="text-center text-xs text-foreground/50">
                Verás los métodos de pago antes de confirmar.
              </p>
              <div className="hidden flex-col gap-2 border-t border-foreground/8 pt-3 lg:flex">
                <Link
                  href="/dashboard/patient/products"
                  className="text-center text-sm font-semibold text-primary hover:underline"
                >
                  Seguir comprando productos
                </Link>
                <Link
                  href="/dashboard/patient/appointments"
                  className="text-center text-sm font-semibold text-primary hover:underline"
                >
                  Agregar otra cita
                </Link>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4 border-t border-foreground/10 pt-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmPurchase();
              }}
            >
              <PaymentMethodsCard
                policy={checkoutPolicy}
                selectedMethod={paymentMethod}
                onSelectMethod={(id) => setPaymentMethod(id as PaymentMethodId)}
                reference={paymentReference}
                onReferenceChange={setPaymentReference}
                proofUrls={proofUrls}
                onProofUrlsChange={setProofUrls}
                note={paymentNote}
                onNoteChange={setPaymentNote}
                totalLabel={totals.label}
                requireAllFields={hasPaidItems}
              />

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? "Confirmando…" : "Confirmar pedido"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setCheckoutOpen(false);
                  resetCheckoutForm();
                }}
                className="w-full rounded-full border border-foreground/15 py-2.5 text-sm font-semibold hover:bg-muted/50 disabled:opacity-50"
              >
                Volver
              </button>

              {hasPaidItems && !isCheckoutComplete && (
                <p className="text-xs text-foreground/55">
                  Para confirmar necesitás: {missingFields.join(", ")}.
                </p>
              )}

              {submitError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              )}
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
