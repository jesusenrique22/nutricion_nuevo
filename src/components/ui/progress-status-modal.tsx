"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ProgressStatusPhase = "working" | "success" | "error";

type ProgressStatusModalProps = {
  open: boolean;
  phase: ProgressStatusPhase;
  title: string;
  description: string;
  /** Solo en success/error: cerrar el modal. */
  onClose?: () => void;
  closeLabel?: string;
};

/**
 * Overlay a pantalla completa: bloquea la UI mientras sube/guarda,
 * y confirma con claridad cuando terminó (o falló).
 */
export function ProgressStatusModal({
  open,
  phase,
  title,
  description,
  onClose,
  closeLabel = "Entendido",
}: ProgressStatusModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (phase === "working") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && phase !== "working") onClose?.();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, phase, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-[4px]" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-busy={phase === "working"}
        aria-live="assertive"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
      >
        <div className="bg-gradient-to-br from-primary/10 via-surface to-accent-soft/25 px-6 pt-8 pb-6 text-center">
          {phase === "working" && (
            <div
              className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary"
              aria-hidden
            />
          )}
          {phase === "success" && (
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700"
              aria-hidden
            >
              ✓
            </div>
          )}
          {phase === "error" && (
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600"
              aria-hidden
            >
              !
            </div>
          )}

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-primary/55">
            Anttova
          </p>
          <h2 className="mt-2 text-xl font-bold text-primary">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">
            {description}
          </p>

          {phase === "working" && (
            <p className="mt-4 text-xs font-medium text-amber-800/90">
              No cierres ni cambies de página hasta que termine.
            </p>
          )}
        </div>

        {phase !== "working" && onClose && (
          <div className="border-t border-foreground/8 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {closeLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
