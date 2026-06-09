"use client";

import Link from "next/link";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestResourceAccess } from "@/server/actions/resource.actions";
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
        Próximamente nuevos recursos.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((r) => (
        <article
          key={r.id}
          className="overflow-hidden rounded-3xl ring-1 ring-primary/10 bg-white"
        >
          <div className="relative aspect-[4/3] bg-muted/30">
            {r.coverUrl && isDisplayableCoverUrl(r.coverUrl) ? (
              <ResourceCoverImage src={r.coverUrl} alt={r.title} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-wider text-foreground/40">
                {typeLabels[r.type] ?? r.type}
              </div>
            )}
          </div>
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
                {Number(r.price) === 0
                  ? "Gratis"
                  : `$${Number(r.price).toLocaleString("es-AR")} ${r.currency}`}
              </span>
              {r.owned ? (
                <Link
                  href="/dashboard/patient/library"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Ver en mi librería →
                </Link>
              ) : showPurchase ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await requestResourceAccess(r.id);
                      if (res.ok) router.refresh();
                      else alert(res.message);
                    })
                  }
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {Number(r.price) === 0 ? "Obtener" : "Solicitar acceso"}
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
        Aún no tienes recursos. Explora la{" "}
        <Link href="/resources" className="font-semibold text-primary">
          tienda
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resources.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-foreground/10 bg-white p-4"
        >
          <div className="text-xs font-bold text-primary">
            {typeLabels[r.type] ?? r.type}
          </div>
          <h3 className="mt-1 font-semibold">{r.title}</h3>
          {r.body && (
            <p className="mt-2 text-sm text-foreground/65">{r.body}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {r.contentUrl && (
              <a
                href={r.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Descargar / ver PDF
              </a>
            )}
            {r.videoUrl && (
              <a
                href={r.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              >
                Ver video
              </a>
            )}
            {r.linkUrl && (
              <a
                href={r.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              >
                Abrir enlace
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
