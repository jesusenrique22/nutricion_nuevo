"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { getProductImages } from "@/lib/product-images";
import { addProductToCart } from "@/server/actions/cart.actions";
import type { ProductItem, ProductPurchaseStatus } from "@/types/products";

function PurchaseAction({
  item,
  canPurchase,
  purchaseStatus,
  onClose,
}: {
  item: ProductItem;
  canPurchase: boolean;
  purchaseStatus?: ProductPurchaseStatus | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (purchaseStatus === "GRANTED") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
        Compra confirmada
      </span>
    );
  }
  if (purchaseStatus === "PENDING") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
        Pago en revisión
      </span>
    );
  }
  if (!canPurchase) {
    return (
      <a
        href="/login"
        className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Iniciar sesión para comprar
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await addProductToCart(item.id);
          if (res.ok) {
            onClose?.();
            router.push("/dashboard/patient/cart");
          } else {
            alert(res.message);
          }
        })
      }
      className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
    >
      {item.price <= 0 ? "Agregar al carrito" : "Comprar ahora"}
    </button>
  );
}

export function ProductDetailView({
  item,
  categoryLabel,
  canPurchase,
  purchaseStatus,
  onClose,
}: {
  item: ProductItem;
  categoryLabel: string | null;
  canPurchase: boolean;
  purchaseStatus?: ProductPurchaseStatus | null;
  onClose?: () => void;
}) {
  const images = getProductImages(item);
  const fullText =
    item.detailDescription.trim() || item.description.trim() || "";
  const shortText = item.description.trim();

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
      <ProductImageGallery images={images} productName={item.name} />

      <div className="flex flex-col">
        {categoryLabel ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {categoryLabel}
          </p>
        ) : null}

        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
          {item.name}
        </h1>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            {item.price > 0 ? (
              <DisplayPrice
                amount={item.price}
                currency={item.currency === "USD" ? "USD" : "ARS"}
              />
            ) : (
              "Gratis"
            )}
          </span>
        </div>

        {shortText && shortText !== fullText ? (
          <p className="mt-4 text-base leading-relaxed text-foreground/75">
            {shortText}
          </p>
        ) : null}

        {fullText ? (
          <div className="mt-6 border-t border-foreground/10 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
              Descripción del producto
            </h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {fullText}
            </div>
          </div>
        ) : null}

        <div className="mt-8 border-t border-foreground/10 pt-6">
          <PurchaseAction
            item={item}
            canPurchase={canPurchase}
            purchaseStatus={purchaseStatus}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
