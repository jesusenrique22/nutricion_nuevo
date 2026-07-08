"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import { ProductDetailModal } from "@/components/products/product-detail-modal";
import { getProductImages, getProductPrimaryImage } from "@/lib/product-images";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { addProductToCart } from "@/server/actions/cart.actions";
import type { ProductItem, ProductsData, ProductPurchaseStatus } from "@/types/products";

const ALL = "__all__";

function ProductCard({
  item,
  categoryLabel,
  canPurchase,
  purchaseStatus,
  onOpenDetail,
}: {
  item: ProductItem;
  categoryLabel: string | null;
  canPurchase: boolean;
  purchaseStatus?: ProductPurchaseStatus | null;
  onOpenDetail: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const primary = getProductPrimaryImage(item);
  const imageCount = getProductImages(item).length;
  const preview =
    item.description.trim() ||
    item.detailDescription.trim().slice(0, 120) ||
    "";

  const buyButton = (() => {
    if (purchaseStatus === "GRANTED") {
      return (
        <span className="text-xs font-semibold text-green-700">
          Compra confirmada
        </span>
      );
    }
    if (purchaseStatus === "PENDING") {
      return (
        <span className="text-xs font-semibold text-amber-600">
          Pago en revisión
        </span>
      );
    }
    if (!canPurchase) {
      return (
        <Link
          href="/login"
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
        >
          Iniciar sesión
        </Link>
      );
    }
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          startTransition(async () => {
            const res = await addProductToCart(item.id);
            if (res.ok) router.push("/dashboard/patient/cart");
            else alert(res.message);
          });
        }}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {item.price <= 0 ? "Al carrito" : "Comprar"}
      </button>
    );
  })();

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-foreground/10 bg-white text-left shadow-sm transition hover:border-primary/25 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-white p-3">
        {primary ? (
          <Image
            src={primary.src}
            alt={primary.alt || item.name}
            fill
            className="object-contain p-1 transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            unoptimized={shouldUnoptimizeImage(primary.src)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-foreground/35">
            Sin imagen
          </div>
        )}
        {imageCount > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            +{imageCount - 1} foto{imageCount > 2 ? "s" : ""}
          </span>
        )}
        {categoryLabel ? (
          <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
            {categoryLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-foreground/8 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {item.name}
        </h3>

        {preview ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/55">
            {preview}
          </p>
        ) : null}

        <div className="mt-2">
          <span className="text-lg font-bold text-foreground">
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

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-xs font-semibold text-primary/80 group-hover:underline">
            Ver detalles
          </span>
          {buyButton}
        </div>
      </div>
    </article>
  );
}

export function ProductCatalog({
  data,
  canPurchase = false,
  purchaseStatuses = {},
}: {
  data: ProductsData;
  canPurchase?: boolean;
  purchaseStatuses?: Record<string, ProductPurchaseStatus>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleItems = useMemo(
    () => data.items.filter((it) => it.enabled),
    [data.items],
  );

  const usedCategories = useMemo(() => {
    const ids = new Set(visibleItems.map((it) => it.categoryId).filter(Boolean));
    return data.categories.filter((c) => ids.has(c.id));
  }, [data.categories, visibleItems]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.categories) map.set(c.id, c.label);
    return map;
  }, [data.categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleItems.filter((it) => {
      if (category !== ALL && it.categoryId !== category) return false;
      if (!q) return true;
      const haystack = `${it.name} ${it.description} ${it.detailDescription} ${
        categoryLabelById.get(it.categoryId) ?? ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [visibleItems, category, query, categoryLabelById]);

  const selectedItem =
    selectedId != null
      ? filtered.find((it) => it.id === selectedId) ??
        visibleItems.find((it) => it.id === selectedId) ??
        null
      : null;

  return (
    <>
      <div className="space-y-6">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 3 3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-full border border-foreground/15 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                category === ALL
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/70 hover:bg-muted/70"
              }`}
            >
              Todos
            </button>
            {usedCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  category === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/70 hover:bg-muted/70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-foreground/20 bg-muted/20 px-6 py-16 text-center text-sm text-foreground/50">
            {visibleItems.length === 0
              ? "Todavía no hay productos publicados."
              : "No se encontraron productos con esa búsqueda."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                categoryLabel={categoryLabelById.get(item.categoryId) ?? null}
                canPurchase={canPurchase}
                purchaseStatus={purchaseStatuses[item.id] ?? null}
                onOpenDetail={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ProductDetailModal
        item={selectedItem}
        categoryLabel={
          selectedItem
            ? (categoryLabelById.get(selectedItem.categoryId) ?? null)
            : null
        }
        canPurchase={canPurchase}
        purchaseStatus={
          selectedItem ? (purchaseStatuses[selectedItem.id] ?? null) : null
        }
        open={selectedItem != null}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
