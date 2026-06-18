"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createConsultationType,
  deleteConsultationType,
  updateConsultationType,
} from "@/server/actions/cms.actions";
import type { ConsultationAdminDTO } from "@/server/actions/cms.actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function formatPrice(price: string) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return n.toLocaleString("es-AR");
}

function formatCode(code: string) {
  return code.replace(/_/g, "-");
}

export function ConsultationPricesEditor({
  types,
}: {
  types: ConsultationAdminDTO[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(types[0]?.id ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (types.length === 0) {
      setActiveId("");
      return;
    }
    if (!types.some((t) => t.id === activeId)) {
      setActiveId(types[0].id);
    }
  }, [types, activeId]);

  const active = types.find((t) => t.id === activeId);

  if (!active && !showCreate) {
    return (
      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white p-6">
        <p className="text-sm text-foreground/50">
          Aún no hay paquetes. Creá el primero para mostrarlo en el lobby.
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Nuevo paquete
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-foreground/8 bg-muted/30 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-lg font-bold text-primary">Paquetes de consulta</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Los paquetes publicados aparecen en el lobby con el botón Agendar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            setMessage(null);
          }}
          className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          {showCreate ? "Cancelar" : "+ Nuevo paquete"}
        </button>
      </div>

      {showCreate && (
        <form
          className="border-b border-foreground/8 bg-accent-soft/20 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createConsultationType({
                name: fd.get("name"),
                description: fd.get("description") || undefined,
                price: fd.get("price"),
                durationMinutes: fd.get("durationMinutes"),
                imageUrl: fd.get("imageUrl") || undefined,
                allowsOnline: fd.get("allowsOnline") === "on",
                allowsPresencial: fd.get("allowsPresencial") === "on",
                morningOnly: fd.get("morningOnly") === "on",
              });
              if (res.ok) {
                setShowCreate(false);
                setMessage(
                  res.code
                    ? `Paquete ${formatCode(res.code)} creado y publicado en el lobby.`
                    : "Paquete creado.",
                );
                router.refresh();
              } else {
                setMessage(res.message);
              }
            });
          }}
        >
          <h4 className="text-base font-bold text-primary">Nuevo paquete</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Nombre</span>
              <input
                name="name"
                required
                className={inputClass}
                placeholder="Ej: Consulta de seguimiento"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Descripción</span>
              <input
                name="description"
                className={inputClass}
                placeholder="Qué incluye este servicio"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Precio ($)</span>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Duración (min)</span>
              <input
                name="durationMinutes"
                type="number"
                min={15}
                max={240}
                defaultValue={60}
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Imagen (URL opcional)</span>
              <input
                name="imageUrl"
                className={inputClass}
                placeholder="/uploads/... o URL pública"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="allowsOnline" type="checkbox" defaultChecked />
              Permite en línea
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="allowsPresencial" type="checkbox" defaultChecked />
              Permite presencial
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input name="morningOnly" type="checkbox" />
              Solo horario matutino
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Creando…" : "Crear paquete"}
          </button>
        </form>
      )}

      {active && (
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          <div className="flex max-h-[11rem] shrink-0 gap-2 overflow-x-auto overflow-y-hidden border-b border-foreground/8 p-4 [-webkit-overflow-scrolling:touch] lg:max-h-[min(28rem,65vh)] lg:w-64 lg:flex-col lg:gap-2 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r lg:pr-2">
            {types.map((t) => {
              const selected = t.id === active.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    setMessage(null);
                  }}
                  className={`min-w-[10rem] shrink-0 rounded-xl px-4 py-3 text-left transition lg:min-w-0 lg:shrink lg:w-full ${
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      selected
                        ? "text-primary-foreground/80"
                        : "text-foreground/50"
                    }`}
                  >
                    {formatCode(t.code)} · ${formatPrice(t.price)}
                  </span>
                  {!t.isPublished && (
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-amber-600">
                      Oculto en lobby
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <form
            key={active.id}
            className="min-w-0 flex-1 p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await updateConsultationType({
                  id: active.id,
                  name: fd.get("name"),
                  description: fd.get("description") || undefined,
                  price: fd.get("price"),
                  durationMinutes: fd.get("durationMinutes"),
                  isPublished: fd.get("isPublished") === "on",
                  sortOrder: fd.get("sortOrder"),
                  imageUrl: fd.get("imageUrl") || "",
                  allowsOnline: fd.get("allowsOnline") === "on",
                  allowsPresencial: fd.get("allowsPresencial") === "on",
                  morningOnly: fd.get("morningOnly") === "on",
                });
                setMessage(
                  res.ok
                    ? `«${String(fd.get("name") || active.name)}» actualizado.`
                    : res.message,
                );
                if (res.ok) router.refresh();
              });
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">
              {formatCode(active.code)}
            </p>
            <h4 className="mt-1 text-xl font-bold text-primary">{active.name}</h4>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Nombre visible para pacientes</span>
                <input
                  name="name"
                  required
                  defaultValue={active.name}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Descripción breve</span>
                <input
                  name="description"
                  defaultValue={active.description ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Precio ($)</span>
                <input
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={active.price}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Duración (minutos)</span>
                <input
                  name="durationMinutes"
                  type="number"
                  min={15}
                  max={240}
                  required
                  defaultValue={active.durationMinutes}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Orden en lobby</span>
                <input
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={active.sortOrder}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Imagen del paquete (URL)</span>
                <input
                  name="imageUrl"
                  defaultValue={active.imageUrl ?? ""}
                  className={inputClass}
                  placeholder="Opcional. Si está vacío, usa imagen por defecto."
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={active.isPublished}
                />
                Publicar en el lobby (botón Agendar)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="allowsOnline"
                  type="checkbox"
                  defaultChecked={active.allowsOnline}
                />
                Permite en línea
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="allowsPresencial"
                  type="checkbox"
                  defaultChecked={active.allowsPresencial}
                />
                Permite presencial
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  name="morningOnly"
                  type="checkbox"
                  defaultChecked={active.morningOnly}
                />
                Solo horario matutino
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setMessage(null);
                  setDeleteOpen(true);
                }}
                className="rounded-full border border-red-200 px-6 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Eliminar paquete
              </button>
              {message && (
                <p className="text-sm text-foreground/70">{message}</p>
              )}
            </div>
          </form>

          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={(next) => {
              if (!isPending) setDeleteOpen(next);
            }}
            title="¿Eliminar este paquete?"
            description={`Vas a eliminar «${active.name}» (${formatCode(active.code)}). Dejará de aparecer en el lobby y los pacientes no podrán agendarlo.`}
            notice="Si el paquete tiene citas vinculadas, no se puede borrar. En ese caso, desmarcá «Publicar en el lobby» para ocultarlo."
            confirmLabel="Sí, eliminar paquete"
            cancelLabel="No, mantener"
            variant="danger"
            loading={isPending}
            onConfirm={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await deleteConsultationType(active.id);
                if (!res.ok) {
                  setMessage(res.message);
                  setDeleteOpen(false);
                  return;
                }
                setDeleteOpen(false);
                const remaining = types.filter((t) => t.id !== active.id);
                setActiveId(remaining[0]?.id ?? "");
                setMessage(`«${active.name}» eliminado.`);
                router.refresh();
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
