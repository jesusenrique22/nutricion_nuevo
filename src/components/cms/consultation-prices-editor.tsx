"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateConsultationType } from "@/server/actions/cms.actions";
import type { ConsultationAdminDTO } from "@/server/actions/cms.actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function formatPrice(price: string) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return n.toLocaleString("es-AR");
}

export function ConsultationPricesEditor({
  types,
}: {
  types: ConsultationAdminDTO[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(types[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = types.find((t) => t.id === activeId) ?? types[0];

  if (!active) {
    return (
      <p className="text-sm text-foreground/50">
        No hay tipos de consulta configurados.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white">
      <div className="border-b border-foreground/8 bg-muted/30 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-bold text-primary">Tipos de consulta</h3>
        <p className="mt-1 text-sm text-foreground/60">
          Elegí un servicio, ajustá nombre, precio y duración. Los pacientes ven
          estos nombres al agendar.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="flex gap-2 overflow-x-auto border-b border-foreground/8 p-4 lg:w-56 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:overflow-x-visible">
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
                className={`min-w-[9.5rem] shrink-0 rounded-xl px-4 py-3 text-left transition lg:min-w-0 lg:w-full ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-semibold">{t.name}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    selected ? "text-primary-foreground/80" : "text-foreground/50"
                  }`}
                >
                  ${formatPrice(t.price)} · {t.durationMinutes} min
                </span>
              </button>
            );
          })}
        </div>

        <form
          key={active.id}
          className="flex-1 p-5 sm:p-6"
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
            Editando
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
                placeholder="Ej: Consulta nutricional"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Descripción breve</span>
              <input
                name="description"
                defaultValue={active.description ?? ""}
                className={inputClass}
                placeholder="Qué incluye esta consulta"
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
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            {message && (
              <p className="text-sm text-foreground/70">{message}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
