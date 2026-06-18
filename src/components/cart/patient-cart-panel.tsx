"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentMethodsCard } from "@/components/cart/payment-methods-card";
import { useDisplayPrice, DisplayPrice } from "@/components/currency/display-price";
import {
  removeCartItem,
  submitCart,
  type CartItemDTO,
} from "@/server/actions/cart.actions";
import { formatMoney } from "@/lib/currency/format";
import type { SupportedCurrency } from "@/lib/currency/types";
import type { PaymentCheckoutPolicy } from "@/types/payment-checkout-policy";
import type { PaymentMethodId } from "@/lib/payment-methods";

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

  const hasPaidItems = useMemo(
    () => items.some((i) => i.price && Number(i.price) > 0),
    [items],
  );

  const totalLabel = useMemo(() => {
    let sum = 0;
    let hasPriced = false;
    for (const item of items) {
      if (!item.price) continue;
      const amount = Number(item.price);
      if (amount > 0) hasPriced = true;
      const base: SupportedCurrency =
        item.currency === "USD" ? "USD" : "ARS";
      sum += convert(item.price, base);
    }
    if (!hasPriced) return "Gratis";
    return formatMoney(sum, displayCurrency);
  }, [items, convert, displayCurrency]);

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
      <p className="rounded-2xl border border-dashed border-foreground/15 px-6 py-12 text-center text-sm text-foreground/50">
        Tu carrito está vacío. Agrega recursos o citas desde el panel.
      </p>
    );
  }

  function resetCheckoutForm() {
    setPaymentMethod(null);
    setPaymentReference("");
    setProofUrls([]);
    setPaymentNote("");
    setSubmitError(null);
  }

  function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      await removeCartItem(itemId);
      if (items.length <= 1) {
        setCheckoutOpen(false);
        resetCheckoutForm();
      }
      router.refresh();
    });
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
    <div className="space-y-6">
      {appointmentAdded && (
        <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
          Cita agregada al carrito. Podés seguir comprando recursos o confirmar
          el pedido cuando quieras.
        </p>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-foreground/10 bg-white p-4"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {item.type === "RESOURCE" ? "Recurso" : "Cita"}
              </p>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-foreground/60">{item.subtitle}</p>
              {item.price && (
                <p className="mt-1 text-sm font-bold text-primary">
                  <DisplayPrice
                    amount={item.price}
                    currency={item.currency === "USD" ? "USD" : "ARS"}
                  />
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleRemoveItem(item.id)}
              className="shrink-0 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/50">
              Total del carrito
            </p>
            <p className="mt-1 text-sm text-foreground/55">
              {items.length} {items.length === 1 ? "ítem" : "ítems"} · en{" "}
              {displayCurrency === "USD" ? "dólares" : "pesos"}
            </p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {totalLabel}
          </p>
        </div>
      </div>

      {!checkoutOpen ? (
        <div className="space-y-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setCheckoutOpen(true)}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-10"
          >
            Comprar
          </button>
          <p className="text-xs text-foreground/50">
            Verás los métodos de pago de Anttova antes de confirmar tu pedido.
          </p>
          <Link
            href="/dashboard/patient/appointments"
            className="inline-block text-sm font-semibold text-primary hover:underline"
          >
            + Agregar otra cita
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
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
            totalLabel={totalLabel}
            requireAllFields={hasPaidItems}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-full border border-foreground/15 px-6 py-3 text-sm font-semibold hover:bg-muted/50 disabled:opacity-50"
            >
              Volver
            </button>
          </div>

          {hasPaidItems && !isCheckoutComplete && (
            <p className="text-xs text-foreground/55">
              Para confirmar necesitás: {missingFields.join(", ")}.
            </p>
          )}

          {proofUrls.length > 0 && (
            <p className="text-xs font-medium text-emerald-700">
              Captura cargada correctamente.
            </p>
          )}

          {submitError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <p className="text-xs text-foreground/50">
            Tras confirmar, la Lic. Ma Antonieta revisará tu referencia y
            comprobante para aprobar el pago.
          </p>
        </form>
      )}
    </div>
  );
}
