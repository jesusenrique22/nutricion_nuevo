"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageMedia } from "@/components/media/image-media";
import {
  ProgressStatusModal,
  type ProgressStatusPhase,
} from "@/components/ui/progress-status-modal";
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<ProgressStatusPhase>("working");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  useEffect(() => {
    setUrls(Object.fromEntries(types.map((t) => [t.id, t.imageUrl ?? ""])));
  }, [types]);

  async function persistImage(type: ConsultationAdminDTO, imageUrl: string) {
    const res = await updateConsultationType({
      id: type.id,
      name: type.name,
      description: type.description ?? undefined,
      price: type.price,
      durationMinutes: type.durationMinutes,
      isPublished: type.isPublished,
      sortOrder: type.sortOrder,
      imageUrl,
      allowsOnline: type.allowsOnline,
      allowsPresencial: type.allowsPresencial,
      morningOnly: type.morningOnly,
    });
    if (!res.ok) {
      throw new Error(res.message ?? "No se pudo guardar la imagen.");
    }
  }

  function saveOne(type: ConsultationAdminDTO) {
    setSavingId(type.id);
    setModalOpen(true);
    setPhase("working");
    setModalTitle("Guardando imagen…");
    setModalDescription(
      `Estamos publicando la foto de «${type.name}». No salgas de esta pantalla.`,
    );
    startTransition(async () => {
      try {
        await persistImage(type, urls[type.id] ?? "");
        setPhase("success");
        setModalTitle("Imagen guardada");
        setModalDescription(
          `«${type.name}» ya muestra esta foto en el lobby.`,
        );
        router.refresh();
      } catch (err) {
        setPhase("error");
        setModalTitle("No se pudo guardar");
        setModalDescription(
          err instanceof Error ? err.message : "Intentá de nuevo en unos segundos.",
        );
      } finally {
        setSavingId(null);
      }
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
        Cada paquete puede tener su propia foto del lobby. Al{" "}
        <strong>subir</strong> una imagen se guarda sola; no hace falta salir de
        la página antes de que aparezca el aviso de “Listo”.
      </p>
      {types.map((type) => {
        const value = urls[type.id] ?? "";
        return (
          <div
            key={type.id}
            className="space-y-3 rounded-2xl border border-foreground/10 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-[6.5rem] shrink-0 overflow-hidden rounded-xl bg-muted">
                {value ? (
                  <Image
                    src={value}
                    alt=""
                    fill
                    className="object-contain p-0.5"
                    sizes="104px"
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
            <ImageMedia.Root
              value={value}
              onChange={(src) =>
                setUrls((prev) => ({ ...prev, [type.id]: src }))
              }
              folder="packages"
              cropShape="rect"
              cropAspectRatio={16 / 10}
              hint="Formato lobby 16:10. La imagen se convierte a JPG al subir."
              onUploaded={async (url) => {
                setUrls((prev) => ({ ...prev, [type.id]: url }));
                await persistImage(type, url);
                router.refresh();
              }}
            >
              <ImageMedia.Label>{`Foto — ${type.name}`}</ImageMedia.Label>
              <ImageMedia.Hint />
              <ImageMedia.UrlField />
              <ImageMedia.Preview />
              <ImageMedia.Actions>
                <ImageMedia.UploadButton />
                <ImageMedia.ClearButton />
              </ImageMedia.Actions>
              <ImageMedia.Library />
              <ImageMedia.StatusModal />
            </ImageMedia.Root>
            <button
              type="button"
              disabled={(isPending && savingId === type.id) || modalOpen}
              onClick={() => saveOne(type)}
              className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50"
            >
              {isPending && savingId === type.id
                ? "Guardando…"
                : "Volver a publicar esta URL"}
            </button>
          </div>
        );
      })}

      <ProgressStatusModal
        open={modalOpen}
        phase={phase}
        title={modalTitle}
        description={modalDescription}
        onClose={() => setModalOpen(false)}
        closeLabel={phase === "success" ? "Perfecto" : "Cerrar"}
      />
    </div>
  );
}
