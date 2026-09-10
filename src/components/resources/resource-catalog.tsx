"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { DisplayPrice } from "@/components/currency/display-price";
import { ArrowRightIcon } from "@/components/ui/link-icons";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import { addResourceToCart } from "@/server/actions/cart.actions";
import type { ResourceDTO } from "@/server/actions/resource.queries";

const typeLabels: Record<string, string> = {
  EBOOK: "E-book",
  VIDEO: "Video",
  LINK: "Enlace",
  PACKAGE: "Paquete",
};

export function ResourceCatalog({
  resources,
  showPurchase = true,
}: {
  resources: ResourceDTO[];
  showPurchase?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (resources.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-foreground/15 px-6 py-12 text-center text-sm text-foreground/50">
        No hay recursos disponibles por ahora.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((r) => (
        <article
          key={r.id}
          className="overflow-hidden rounded-3xl bg-white ring-1 ring-primary/10"
        >
          <Link href={`/dashboard/patient/library/${r.id}/preview`}>
            <div className="relative aspect-[4/3] bg-muted/30">
              {r.coverUrl && isDisplayableCoverUrl(r.coverUrl) ? (
                <ResourceCoverImage src={r.coverUrl} alt={r.title} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-wider text-foreground/40">
                  {typeLabels[r.type] ?? r.type}
                </div>
              )}
            </div>
          </Link>
          <div className="p-4">
            <span className="text-xs font-bold text-primary">
              {typeLabels[r.type] ?? r.type}
              {r.category ? ` · ${r.category}` : ""}
            </span>
            <h3 className="mt-1 font-semibold">{r.title}</h3>
            {r.description && (
              <p className="mt-1 line-clamp-2 text-sm text-foreground/60">
                {r.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-bold text-primary">
                <DisplayPrice
                  amount={r.price}
                  currency={r.currency === "USD" ? "USD" : "ARS"}
                />
              </span>
              {r.accessStatus === "PENDING" ? (
                <span className="text-xs font-semibold text-amber-600">
                  Solicitud pendiente
                </span>
              ) : showPurchase ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await addResourceToCart(r.id);
                      if (res.ok) router.push("/dashboard/patient/cart");
                      else alert(res.message);
                    })
                  }
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Agregar al carrito
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function LibraryResourceList({
  resources,
}: {
  resources: ResourceDTO[];
}) {
  if (resources.length === 0) {
    return (
      <p className="rounded-2xl border border-foreground/10 bg-white px-6 py-10 text-center text-sm text-foreground/50">
        Aún no tienes recursos comprados. Explora la sección Disponibles.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resources.map((r) => (
        <Link
          key={r.id}
          href={`/dashboard/patient/library/${r.id}`}
          className="rounded-2xl border border-foreground/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-xs font-bold text-primary">
            {typeLabels[r.type] ?? r.type}
          </div>
          <h3 className="mt-1 font-semibold">{r.title}</h3>
          {r.description && (
            <p className="mt-2 line-clamp-2 text-sm text-foreground/65">
              {r.description}
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            Ver recurso
            <ArrowRightIcon className="h-3 w-3" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function PendingResourceList({
  resources,
}: {
  resources: ResourceDTO[];
}) {
  if (resources.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resources.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-900/80">
              {typeLabels[r.type] ?? r.type}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              En proceso
            </span>
          </div>
          <h3 className="mt-1.5 font-semibold text-foreground">{r.title}</h3>
          {r.description && (
            <p className="mt-1 line-clamp-2 text-sm text-foreground/65">
              {r.description}
            </p>
          )}
          <p className="mt-3 text-xs text-amber-800/80">
            Tu pago está siendo verificado por la administración. Se desbloqueará automáticamente aquí ni bien sea aprobado.
          </p>
        </article>
      ))}
    </div>
  );
}
