"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { DisplayPrice } from "@/components/currency/display-price";
import {
  deleteResource,
  toggleResourcePublished,
  upsertResource,
  type DeleteResourceScope,
} from "@/server/actions/resource.actions";
import type { ResourceDTO } from "@/server/actions/resource.queries";
import { DeleteResourceDialog } from "@/components/resources/delete-resource-dialog";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import { uploadFile as uploadPublicFile } from "@/lib/client-upload";
import { DecimalInput } from "@/components/ui/decimal-input";
import { CurrencyFieldSelect } from "@/components/currency/currency-field-select";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

const emptyForm = {
  title: "",
  description: "",
  type: "EBOOK" as "EBOOK" | "VIDEO" | "LINK" | "PACKAGE",
  coverUrl: "",
  contentUrl: "",
  videoUrl: "",
  linkUrl: "",
  body: "",
  price: "0",
  currency: "ARS",
  category: "",
  isPublished: false,
  sortOrder: "0",
};

export function AdminResourceManager({
  resources,
}: {
  resources: ResourceDTO[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<
    "coverUrl" | "contentUrl" | null
  >(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceDTO | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function buildPayload(nextForm: typeof form, id?: string) {
    return {
      id,
      ...nextForm,
      price: Number(nextForm.price),
      sortOrder: Number(nextForm.sortOrder),
    };
  }

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
    setMessage(null);
  }

  function openEdit(r: ResourceDTO) {
    setEditing(r.id);
    setForm({
      title: r.title,
      description: r.description ?? "",
      type: r.type as typeof emptyForm.type,
      coverUrl: r.coverUrl ?? "",
      contentUrl: r.contentUrl ?? "",
      videoUrl: r.videoUrl ?? "",
      linkUrl: r.linkUrl ?? "",
      body: r.body ?? "",
      price: r.price,
      currency: r.currency,
      category: r.category ?? "",
      isPublished: r.isPublished,
      sortOrder: String(r.sortOrder),
    });
    setMessage(null);
  }

  async function uploadFile(file: File, target: "coverUrl" | "contentUrl") {
    setUploading(true);
    setMessage(null);
    try {
      if (file.size > 4.5 * 1024 * 1024) {
        throw new Error(
          `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite de 4.5 MB soportado en la nube. Por favor comprímelo antes de subirlo.`,
        );
      }

      const kind =
        target === "coverUrl"
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : "any";
      const { url } = await uploadPublicFile(file, {
        folder: "resources",
        kind,
      });

      const nextForm = { ...form, [target]: url };
      setForm(nextForm);

      if (editing && editing !== "new") {
        const saveRes = await upsertResource(
          buildPayload(nextForm, editing),
        );
        setMessage(
          saveRes.ok
            ? target === "coverUrl"
              ? "Portada actualizada y guardada."
              : "Archivo principal actualizado y guardado correctamente."
            : saveRes.message,
        );
        if (saveRes.ok) router.refresh();
      } else {
        setMessage(
          target === "coverUrl"
            ? "Portada subida. Pulsa Guardar para publicarla."
            : "Archivo subido. Pulsa Guardar para publicarlo.",
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await upsertResource(
        buildPayload(
          form,
          editing === "new" ? undefined : (editing ?? undefined),
        ),
      );
      setMessage(res.ok ? "Guardado." : res.message);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function handleDeleteConfirm(scope: DeleteResourceScope) {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteResource(deleteTarget.id, scope);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setDeleteTarget(null);
      setMessage(
        scope === "new_only"
          ? "Recurso oculto para nuevos pacientes."
          : "Recurso eliminado para todos.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <p className="text-sm text-foreground/60">
          Sube e-books, videos, enlaces y material para pacientes. Los tipo{" "}
          <strong>Paquete</strong> publicados se muestran en la landing.
        </p>
        <button
          type="button"
          onClick={openNew}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Nuevo recurso
        </button>
      </div>

      {message && (
        <p
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            message === "Guardado." || message === "Portada actualizada en la tienda."
              ? "border-foreground/10 bg-foreground/5 text-foreground/70"
              : "border-red-200 bg-red-50 font-medium text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      {editing && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-primary/20 bg-white p-6"
        >
          <h3 className="font-bold">
            {editing === "new" ? "Nuevo recurso" : "Editar recurso"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Título</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Descripción (catálogo)</span>
              <span className="mt-0.5 block text-xs font-normal text-foreground/55">
                Texto breve que ven los pacientes en la tienda antes de comprar.
                No es el PDF ni el contenido del documento.
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className={inputClass}
                placeholder="Ej.: Guía de alimentación post-consulta, 12 páginas."
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Tipo</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as typeof form.type,
                  })
                }
                className={inputClass}
              >
                <option value="EBOOK">E-book / PDF</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">Enlace externo</option>
                <option value="PACKAGE">Paquete (visible en landing)</option>
              </select>
              {form.type === "PACKAGE" && (
                <span className="mt-1 block text-xs text-foreground/55">
                  Aparece en la página de recursos al publicarlo.
                </span>
              )}
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Categoría</span>
              <input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Precio</span>
              <DecimalInput
                required
                value={Number(form.price) || 0}
                onChange={(price) =>
                  setForm({ ...form, price: String(price) })
                }
                className={inputClass}
                placeholder="Ej: 15000 o 15,50"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Moneda</span>
              <CurrencyFieldSelect
                value={form.currency}
                onChange={(currency) =>
                  setForm({ ...form, currency })
                }
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">URL video (YouTube, MP4…)</span>
              <input
                value={form.videoUrl}
                onChange={(e) =>
                  setForm({ ...form, videoUrl: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Enlace externo</span>
              <input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Portada (URL)</span>
              <input
                value={form.coverUrl}
                onChange={(e) =>
                  setForm({ ...form, coverUrl: e.target.value })
                }
                placeholder="https://…/imagen.jpg o subir archivo"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-foreground/50">
                URL directa de imagen (.jpg, .png, .webp). No uses enlaces a
                artículos.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  className="text-xs font-semibold text-primary disabled:opacity-50"
                  onClick={() => {
                    setUploadTarget("coverUrl");
                    fileRef.current?.click();
                  }}
                >
                  {uploading && uploadTarget === "coverUrl"
                    ? "Subiendo…"
                    : "Subir imagen"}
                </button>
                {form.coverUrl && (
                  <button
                    type="button"
                    disabled={uploading}
                    className="text-xs font-semibold text-foreground/50 disabled:opacity-50"
                    onClick={() => setForm({ ...form, coverUrl: "" })}
                  >
                    Quitar portada
                  </button>
                )}
              </div>
              {form.coverUrl && isDisplayableCoverUrl(form.coverUrl) && (
                <div className="relative mt-3 aspect-[4/3] max-w-xs overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <ResourceCoverImage
                    src={form.coverUrl}
                    alt="Vista previa de portada"
                    sizes="320px"
                  />
                </div>
              )}
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Archivo principal (PDF)</span>
              <span className="mt-0.5 block text-xs font-normal text-foreground/55">
                Documento que el paciente lee al desbloquear el recurso. Subí
                el PDF aquí; es obligatorio para e-books.
              </span>
              <input
                value={form.contentUrl}
                onChange={(e) =>
                  setForm({ ...form, contentUrl: e.target.value })
                }
                className={inputClass}
                placeholder="URL del archivo o subilo desde el botón"
              />
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-primary"
                onClick={() => {
                  setUploadTarget("contentUrl");
                  fileRef.current?.click();
                }}
              >
                Subir PDF
              </button>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Texto al abrir el recurso</span>
              <span className="mt-0.5 block text-xs font-normal text-foreground/55">
                Opcional. Instrucciones o notas que aparecen arriba del PDF al
                abrirlo. No reemplaza el archivo subido.
              </span>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                className={inputClass}
                placeholder="Ej.: Leé primero la introducción y luego la tabla de porciones."
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.checked })
                }
              />
              Publicado en tienda
            </label>
          </div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,video/mp4,video/webm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !uploadTarget) return;
              try {
                await uploadFile(file, uploadTarget);
              } catch (err) {
                setMessage(
                  err instanceof Error ? err.message : "Error al subir",
                );
              }
              e.target.value = "";
            }}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || uploading}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border px-5 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {resources.length === 0 && (
          <p className="text-sm text-foreground/50">Sin recursos aún.</p>
        )}
        {resources.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-white p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/30">
                {r.coverUrl && isDisplayableCoverUrl(r.coverUrl) ? (
                  <ResourceCoverImage
                    src={r.coverUrl}
                    alt=""
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-foreground/35">
                    {r.type}
                  </div>
                )}
              </div>
              <div className="min-w-0">
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-foreground/50">
                {r.type} ·{" "}
                <DisplayPrice
                  amount={r.price}
                  currency={r.currency === "USD" ? "USD" : "ARS"}
                />
                {r.isPublished ? " · Publicado" : " · Borrador"}
              </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEdit(r)}
                className="text-sm font-semibold text-primary"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleResourcePublished(r.id, !r.isPublished);
                    router.refresh();
                  })
                }
                className="text-sm font-semibold"
              >
                {r.isPublished ? "Despublicar" : "Publicar"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setMessage(null);
                  setDeleteTarget(r);
                }}
                className="text-sm font-semibold text-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeleteResourceDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ""}
        loading={isPending}
        onOpenChange={(open) => {
          if (!isPending && !open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
