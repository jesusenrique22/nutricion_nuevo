"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { LoadingButton } from "@/components/ui/loading-button";
import type { DeleteResourceScope } from "@/server/actions/resource.actions";

type DeleteResourceDialogProps = {
  open: boolean;
  title: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: DeleteResourceScope) => void;
};

export function DeleteResourceDialog({
  open,
  title,
  loading = false,
  onOpenChange,
  onConfirm,
}: DeleteResourceDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstActionRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        disabled={loading}
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-primary/45 backdrop-blur-[3px]"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
      >
        <div className="bg-gradient-to-br from-primary/8 via-surface to-accent-soft/20 px-6 pt-6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/60">
            Anttova
          </p>
          <h2 id={titleId} className="mt-2 text-xl font-bold text-primary">
            ¿Qué querés hacer con «{title}»?
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p id={descriptionId} className="text-sm leading-relaxed text-foreground/75">
            Elegí si querés ocultarlo solo para pacientes nuevos o eliminarlo por
            completo.
          </p>

          <div className="space-y-3">
            <button
              ref={firstActionRef}
              type="button"
              disabled={loading}
              onClick={() => onConfirm("new_only")}
              className="w-full rounded-2xl border border-foreground/15 bg-white px-4 py-4 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
            >
              <p className="text-sm font-bold text-foreground">
                Ocultar para nuevos pacientes
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                Deja de aparecer en la tienda. Quienes ya lo tienen desbloqueado
                siguen viéndolo.
              </p>
            </button>

            <LoadingButton
              type="button"
              loading={loading}
              loadingLabel="Eliminando…"
              indicatorVariant="onPrimary"
              disabled={loading}
              onClick={() => onConfirm("all")}
              className="w-full rounded-2xl bg-red-600 px-4 py-4 text-left text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <span className="block text-sm font-bold">
                Eliminar para todos
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-white/85">
                Borra el recurso y retira el acceso a todos los pacientes, incluso
                los que ya lo tenían.
              </span>
            </LoadingButton>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-muted/50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
