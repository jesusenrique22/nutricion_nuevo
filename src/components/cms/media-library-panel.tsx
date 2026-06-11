"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/fetch-json";
import { shouldUnoptimizeImage } from "@/lib/media-url";

type MediaItem = {
  id: string;
  url: string;
  mimeType: string;
  fileName: string | null;
  createdAt: string;
};

export function MediaLibraryPanel({
  folder = "site",
  selectedUrl,
  onSelect,
  refreshKey = 0,
}: {
  folder?: string;
  selectedUrl?: string;
  onSelect: (url: string) => void;
  refreshKey?: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/library?folder=${encodeURIComponent(folder)}`);
      const json = await parseJsonResponse<{ items?: MediaItem[] }>(res);
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar la biblioteca");
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (open) void loadItems();
  }, [open, loadItems, refreshKey]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta imagen de la biblioteca? No se podrá recuperar.")) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/media/library/${id}`, { method: "DELETE" });
      const json = await parseJsonResponse<Record<string, never>>(res);
      if (!res.ok) throw new Error(json.error ?? "No se pudo eliminar");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-foreground/15 bg-background/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground/80"
      >
        <span>Biblioteca de imágenes</span>
        <span className="text-foreground/50">{open ? "Ocultar" : "Ver anteriores"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {loading && (
            <p className="text-xs text-foreground/55">Cargando imágenes…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="text-xs text-foreground/55">
              Aún no hay imágenes subidas. Al subir una, aparecerá aquí para reutilizarla.
            </p>
          )}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    className={`group relative aspect-square overflow-hidden rounded-lg border ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-foreground/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(item.url)}
                      className="absolute inset-0 z-0"
                      title={item.fileName ?? "Usar esta imagen"}
                    >
                      <Image
                        src={item.url}
                        alt={item.fileName ?? ""}
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized={shouldUnoptimizeImage(item.url)}
                      />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item.id);
                      }}
                      className="absolute right-1 top-1 z-10 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deletingId === item.id ? "…" : "Borrar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
