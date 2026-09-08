"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import {
  removeCartItem,
  updateCartItemQuantity,
  type CartItemDTO,
} from "@/server/actions/cart.actions";
import { formatMoney } from "@/lib/currency/format";
import type { SupportedCurrency } from "@/lib/currency/types";

const TYPE_LABELS: Record<CartItemDTO["type"], string> = {
  PRODUCT: "Producto",
  RESOURCE: "Recurso",
  APPOINTMENT: "Cita",
};

function lineAmount(item: CartItemDTO): number {
  if (!item.price) return 0;
  const unit = Number(item.price);
  if (!Number.isFinite(unit) || unit <= 0) return 0;
  return unit * (item.quantity ?? 1);
}

function itemCurrency(item: CartItemDTO): SupportedCurrency {
  return item.currency === "USD" ? "USD" : "ARS";
}

function CartItemImage({
  item,
}: {
  item: CartItemDTO;
}) {
  const src = item.imageUrl?.trim();
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-foreground/10 bg-muted/30 sm:h-28 sm:w-28">
      {src ? (
        <Image
          src={src}
          alt={item.title}
          fill
          className="object-contain p-1.5"
          sizes="112px"
          unoptimized={shouldUnoptimizeImage(src)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-medium text-foreground/35">
          <span className="text-lg opacity-40">
            {item.type === "APPOINTMENT" ? "📅" : item.type === "RESOURCE" ? "📄" : "🛒"}
          </span>
          Sin foto
        </div>
      )}
    </div>
  );
}

export function CartLineItem({
  item,
  disabled,
}: {
  item: CartItemDTO;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const busy = disabled || isPending;
  const currency = itemCurrency(item);
  const unit = item.price ? Number(item.price) : 0;
  const lineTotal = lineAmount(item);

  function refresh() {
    router.refresh();
  }

  function handleRemove() {
    if (!confirm(`¿Quitar «${item.title}» del carrito?`)) return;
    startTransition(async () => {
      await removeCartItem(item.id);
      refresh();
    });
  }

  function handleQuantity(next: number) {
    startTransition(async () => {
      await updateCartItemQuantity(item.id, next);
      refresh();
    });
  }

  return (
    <article className="flex gap-4 rounded-2xl border border-foreground/10 bg-white p-4 shadow-sm">
      <CartItemImage item={item} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
              {TYPE_LABELS[item.type]}
            </p>
            <h3 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
              {item.title}
            </h3>
            {item.subtitle ? (
              <p className="mt-1 text-sm text-foreground/55">{item.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleRemove}
            className="shrink-0 text-xs font-semibold text-foreground/45 hover:text-red-600 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
          <div className="space-y-1">
            {unit > 0 ? (
              <p className="text-xs text-foreground/50">
                {item.type === "APPOINTMENT" && item.fullPrice
                  ? "Cuota de esta etapa: "
                  : "Precio unitario: "}
                <DisplayPrice amount={item.price!} currency={currency} />
              </p>
            ) : (
              <p className="text-xs font-semibold text-green-700">Gratis</p>
            )}

            {item.type === "PRODUCT" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/55">
                  Cantidad:
                </span>
                <div className="inline-flex items-center rounded-lg border border-foreground/15 bg-muted/30">
                  <button
                    type="button"
                    disabled={busy || item.quantity <= 1}
                    onClick={() => handleQuantity(item.quantity - 1)}
                    className="px-2.5 py-1.5 text-sm font-bold hover:bg-white disabled:opacity-30"
                    aria-label="Menos cantidad"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] px-2 text-center text-sm font-bold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={busy || item.quantity >= 99}
                    onClick={() => handleQuantity(item.quantity + 1)}
                    className="px-2.5 py-1.5 text-sm font-bold hover:bg-white disabled:opacity-30"
                    aria-label="Más cantidad"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground/45">Cantidad: 1</p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
              {item.type === "APPOINTMENT" && item.fullPrice
                ? item.advancePercent != null && item.advancePercent > 0
                  ? `A pagar ahora (${item.advancePercent}%)`
                  : "A pagar ahora"
                : "Subtotal"}
            </p>
            <p className="text-xl font-bold tabular-nums text-primary">
              {lineTotal > 0 ? (
                <DisplayPrice amount={lineTotal} currency={currency} />
              ) : (
                "Gratis"
              )}
            </p>
            {item.type === "APPOINTMENT" && item.fullPrice ? (
              <p className="mt-1 text-xs text-foreground/50">
                Total de la cita:{" "}
                <DisplayPrice amount={item.fullPrice} currency={currency} />
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function cartItemsTotal(
  items: CartItemDTO[],
  convert: (amount: string | number, from: SupportedCurrency) => number,
  displayCurrency: SupportedCurrency,
  discountPercent?: number | null,
): {
  label: string;
  units: number;
  hasPriced: boolean;
  rawSum: number;
  discountLabel?: string;
} {
  let sum = 0;
  let hasPriced = false;
  let units = 0;
  for (const item of items) {
    units += item.quantity ?? 1;
    const line = lineAmount(item);
    if (line > 0) hasPriced = true;
    sum += convert(line, itemCurrency(item));
  }
  const pct =
    discountPercent && discountPercent > 0
      ? Math.min(100, Math.max(0, Math.round(discountPercent)))
      : 0;
  const after =
    pct > 0
      ? Math.round(sum * (100 - pct)) / 100
      : sum;
  return {
    units,
    hasPriced,
    rawSum: sum,
    discountLabel:
      pct > 0 && hasPriced
        ? `−${pct}% (${formatMoney(sum - after, displayCurrency)})`
        : undefined,
    label: !hasPriced
      ? "Gratis"
      : formatMoney(after, displayCurrency),
  };
}
