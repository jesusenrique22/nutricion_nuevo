"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ListPaginationMeta } from "@/lib/pagination";

function pageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ListPagination({
  basePath,
  meta,
  params = {},
  className = "",
}: {
  basePath: string;
  meta: ListPaginationMeta;
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  const { page, pageSize, total, totalPages } = meta;
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`}
      aria-label="Paginación"
    >
      <p className="text-sm text-foreground/55">
        Mostrando{" "}
        <span className="font-semibold text-foreground">
          {from}–{to}
        </span>{" "}
        de <span className="font-semibold text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        {canPrev ? (
          <Link
            href={pageHref(basePath, params, prevPage)}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold transition hover:bg-muted/50"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-full border border-foreground/10 px-4 py-2 text-sm font-semibold text-foreground/35">
            Anterior
          </span>
        )}

        <div className="relative min-w-[9.5rem] overflow-hidden rounded-full bg-primary/10 px-4 py-2 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-bold text-primary"
            >
              Página {page} de {totalPages}
            </motion.p>
          </AnimatePresence>
        </div>

        {canNext ? (
          <Link
            href={pageHref(basePath, params, nextPage)}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold transition hover:bg-muted/50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-full border border-foreground/10 px-4 py-2 text-sm font-semibold text-foreground/35">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
