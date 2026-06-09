"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateConsultationType } from "@/server/actions/cms.actions";
import type { ConsultationAdminDTO } from "@/server/actions/cms.actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function ConsultationPricesEditor({
  types,
}: {
  types: ConsultationAdminDTO[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {types.map((t) => (
        <form
          key={t.id}
          className="rounded-2xl border border-foreground/10 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateConsultationType({
                id: t.id,
                name: fd.get("name"),
                description: fd.get("description") || undefined,
                price: fd.get("price"),
                durationMinutes: fd.get("durationMinutes"),
              });
              setMessage(res.ok ? "Precios actualizados." : res.message);
              if (res.ok) router.refresh();
            });
          }}
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
            {t.code}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Nombre</span>
              <input
                name="name"
                required
                defaultValue={t.name}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Descripción</span>
              <input
                name="description"
                defaultValue={t.description ?? ""}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Precio</span>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={t.price}
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
                required
                defaultValue={t.durationMinutes}
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Guardar {t.code}
          </button>
        </form>
      ))}
      {message && <p className="text-sm text-foreground/70">{message}</p>}
    </div>
  );
}
