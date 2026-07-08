"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { ProductDetailView } from "@/components/products/product-detail-view";
import type { ProductItem, ProductPurchaseStatus } from "@/types/products";

export function ProductDetailModal({
  item,
  categoryLabel,
  canPurchase,
  purchaseStatus,
  open,
  onClose,
}: {
  item: ProductItem | null;
  categoryLabel: string | null;
  canPurchase: boolean;
  purchaseStatus?: ProductPurchaseStatus | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !item || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-5xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-4 py-3 sm:px-6">
          <p id={titleId} className="truncate pr-4 text-sm font-semibold text-foreground/70">
            Detalle del producto
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-foreground/15 px-3 py-1 text-sm font-semibold hover:bg-muted/50"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <ProductDetailView
            item={item}
            categoryLabel={categoryLabel}
            canPurchase={canPurchase}
            purchaseStatus={purchaseStatus}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
