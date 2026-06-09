"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnthropometryMeasurement } from "@/server/actions/measurement.actions";

export function RegisterMeasurementForm({
  patientId,
  appointmentId,
  compact = false,
}: {
  patientId: string;
  appointmentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createAnthropometryMeasurement({
        patientId,
        appointmentId,
        measuredAt: fd.get("measuredAt")?.toString() || undefined,
        weight: fd.get("weight")?.toString() || undefined,
        bodyFatPct: fd.get("bodyFatPct")?.toString() || undefined,
        muscleMass: fd.get("muscleMass")?.toString() || undefined,
        waist: fd.get("waist")?.toString() || undefined,
        hip: fd.get("hip")?.toString() || undefined,
        notes: fd.get("notes")?.toString() || undefined,
      });

      if (!res.ok) {
        setMessage(res.message);
        return;
      }

      setMessage("Medición registrada.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-2"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        <label className="block text-sm">
          <span className="font-semibold">Fecha</span>
          <input
            type="datetime-local"
            name="measuredAt"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Peso (kg)</span>
          <input
            type="number"
            name="weight"
            step="0.1"
            min="0"
            placeholder="Ej. 72.5"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">% Grasa</span>
          <input
            type="number"
            name="bodyFatPct"
            step="0.1"
            min="0"
            max="100"
            placeholder="Ej. 22.4"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Masa muscular (kg)</span>
          <input
            type="number"
            name="muscleMass"
            step="0.1"
            min="0"
            placeholder="Ej. 35.2"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Cintura (cm)</span>
          <input
            type="number"
            name="waist"
            step="0.1"
            min="0"
            placeholder="Ej. 78"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Cadera (cm)</span>
          <input
            type="number"
            name="hip"
            step="0.1"
            min="0"
            placeholder="Ej. 98"
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      {!compact && (
        <label className="block text-sm">
          <span className="font-semibold">Notas (opcional)</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Observaciones de la evaluación ISAK…"
            className={`mt-1 ${inputClass}`}
          />
        </label>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Registrar medición"}
      </button>

      {message && (
        <p className="text-sm text-foreground/70">{message}</p>
      )}
    </form>
  );
}
