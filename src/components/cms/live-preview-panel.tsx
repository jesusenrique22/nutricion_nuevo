"use client";

import React from "react";

/**
 * Wrapper que envuelve un editor + su panel de previsualización en vivo.
 * En mobile: preview colapsable arriba.
 * En desktop (lg+): editor a la izquierda, preview sticky a la derecha.
 */
export function LivePreviewLayout({
  children,
  preview,
  previewLabel = "Vista previa",
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
  previewLabel?: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      {/* Editor */}
      <div className="min-w-0">{children}</div>

      {/* Preview panel — sticky */}
      <div className="xl:sticky xl:top-4">
        <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-foreground/8 bg-muted/40 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-foreground/60">
              {previewLabel}
            </span>
            <span className="ml-auto text-[10px] text-foreground/35">
              se actualiza al editar
            </span>
          </div>
          <div className="p-4">{preview}</div>
        </div>
      </div>
    </div>
  );
}

/** Placeholder cuando no hay imagen */
export function ImgPlaceholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-muted text-xs text-foreground/35 ${className}`}
    >
      {label}
    </div>
  );
}
