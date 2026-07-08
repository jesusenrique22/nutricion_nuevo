"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnthropometryMeasurement } from "@/server/actions/measurement.actions";
import { DecimalInput } from "@/components/ui/decimal-input";

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
  const [formKey, setFormKey] = useState(0);
  const [weight, setWeight] = useState(0);
  const [bodyFatPct, setBodyFatPct] = useState(0);
  const [muscleMass, setMuscleMass] = useState(0);
  const [waist, setWaist] = useState(0);
  const [hip, setHip] = useState(0);

  function resetFields() {
    setWeight(0);
    setBodyFatPct(0);
    setMuscleMass(0);
    setWaist(0);
    setHip(0);
    setFormKey((k) => k + 1);
  }

  function optionalMeasurement(
    fd: FormData,
    name: string,
    current: number,
  ): string | undefined {
    if (current <= 0) return undefined;
    return fd.get(name)?.toString() || undefined;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createAnthropometryMeasurement({
        patientId,
        appointmentId,
        measuredAt: fd.get("measuredAt")?.toString() || undefined,
        weight: optionalMeasurement(fd, "weight", weight),
        bodyFatPct: optionalMeasurement(fd, "bodyFatPct", bodyFatPct),
        muscleMass: optionalMeasurement(fd, "muscleMass", muscleMass),
        waist: optionalMeasurement(fd, "waist", waist),
        hip: optionalMeasurement(fd, "hip", hip),
        notes: fd.get("notes")?.toString() || undefined,
      });

      if (!res.ok) {
        setMessage(res.message);
        return;
      }

      setMessage("Medición registrada.");
      resetFields();
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className={compact ? "space-y-3" : "space-y-4"}
    >
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
          <DecimalInput
            name="weight"
            value={weight}
            onChange={setWeight}
            maxDecimals={1}
            className={`mt-1 ${inputClass}`}
            placeholder="Ej. 72,5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">% Grasa</span>
          <DecimalInput
            name="bodyFatPct"
            value={bodyFatPct}
            onChange={setBodyFatPct}
            max={100}
            maxDecimals={1}
            className={`mt-1 ${inputClass}`}
            placeholder="Ej. 22,4"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Masa muscular (kg)</span>
          <DecimalInput
            name="muscleMass"
            value={muscleMass}
            onChange={setMuscleMass}
            maxDecimals={1}
            className={`mt-1 ${inputClass}`}
            placeholder="Ej. 35,2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Cintura (cm)</span>
          <DecimalInput
            name="waist"
            value={waist}
            onChange={setWaist}
            maxDecimals={1}
            className={`mt-1 ${inputClass}`}
            placeholder="Ej. 78"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Cadera (cm)</span>
          <DecimalInput
            name="hip"
            value={hip}
            onChange={setHip}
            maxDecimals={1}
            className={`mt-1 ${inputClass}`}
            placeholder="Ej. 98"
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
