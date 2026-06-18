"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  notice,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

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

  const confirmClass =
    variant === "danger"
      ? "rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      : "rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

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
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
      >
        <div className="bg-gradient-to-br from-primary/8 via-surface to-accent-soft/20 px-6 pt-6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/60">
            Anttova
          </p>
          <h2 id={titleId} className="mt-2 text-xl font-bold text-primary">
            {title}
          </h2>
        </div>

        <div className="px-6 py-5">
          <p id={descriptionId} className="text-sm leading-relaxed text-foreground/75">
            {description}
          </p>
          {notice && (
            <p className="mt-4 rounded-2xl border border-primary/10 bg-muted/40 px-4 py-3 text-sm text-foreground/70">
              {notice}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-muted/50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={confirmClass}
            >
              {loading ? "Procesando…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
