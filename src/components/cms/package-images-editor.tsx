"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/cms/image-upload-field";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { updateConsultationType } from "@/server/actions/cms.actions";
import type { ConsultationAdminDTO } from "@/server/actions/cms.actions";

export function PackageImagesEditor({
  types,
}: {
  types: ConsultationAdminDTO[];
}) {
  const router = useRouter();
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(types.map((t) => [t.id, t.imageUrl ?? ""])),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUrls(Object.fromEntries(types.map((t) => [t.id, t.imageUrl ?? ""])));
  }, [types]);

  function saveOne(type: ConsultationAdminDTO) {
    setMessage(null);
    setSavingId(type.id);
    startTransition(async () => {
      const res = await updateConsultationType({
        id: type.id,
        name: type.name,
        description: type.description ?? undefined,
        price: type.price,
        durationMinutes: type.durationMinutes,
        isPublished: type.isPublished,
        sortOrder: type.sortOrder,
        imageUrl: urls[type.id] ?? "",
        allowsOnline: type.allowsOnline,
        allowsPresencial: type.allowsPresencial,
        morningOnly: type.morningOnly,
      });
      setMessage(
        res.ok
          ? `Imagen de «${type.name}» guardada.`
          : res.message ?? "No se pudo guardar.",
      );
      setSavingId(null);
      if (res.ok) router.refresh();
    });
  }

  if (types.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-foreground/15 px-4 py-8 text-center text-sm text-foreground/55">
        Todavía no hay paquetes. Creá uno en Precios y Cotización.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/60">
        Cada paquete (incluido uno nuevo) puede tener su propia foto del lobby.
        Si está vacío, se usa la imagen genérica por tipo.
      </p>
      {types.map((type) => {
        const value = urls[type.id] ?? "";
        return (
          <div
            key={type.id}
            className="rounded-2xl border border-foreground/10 bg-white p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {value ? (
                  <Image
                    src={value}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={shouldUnoptimizeImage(value)}
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-foreground/40">
                    Sin foto
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{type.name}</p>
                <p className="text-xs text-foreground/50">
                  {type.code.replace(/_/g, "-")}
                  {!type.isPublished ? " · oculto en lobby" : ""}
                </p>
              </div>
            </div>
            <ImageUploadField
              label={`Foto — ${type.name}`}
              value={value}
              onChange={(src) =>
                setUrls((prev) => ({ ...prev, [type.id]: src }))
              }
              folder="packages"
            />
            <button
              type="button"
              disabled={isPending && savingId === type.id}
              onClick={() => saveOne(type)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPending && savingId === type.id
                ? "Guardando…"
                : "Guardar esta imagen"}
            </button>
          </div>
        );
      })}
      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
    </div>
  );
}
