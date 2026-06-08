"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import { getSlotsForDay } from "@/server/actions/booking.queries";
import { createAppointment } from "@/server/actions/appointment.actions";
import type { Slot } from "@/server/services/availability.service";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingForm({ types }: { types: ConsultationTypeDTO[] }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [modality, setModality] = useState<"ONLINE" | "PRESENCIAL">(
    "PRESENCIAL",
  );
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = types.find((t) => t.id === typeId);

  // Ajusta modalidad si el tipo no permite la seleccionada
  useEffect(() => {
    if (!selectedType) return;
    if (modality === "ONLINE" && !selectedType.allowsOnline) {
      setModality("PRESENCIAL");
    } else if (modality === "PRESENCIAL" && !selectedType.allowsPresencial) {
      setModality("ONLINE");
    }
  }, [typeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga slots al cambiar tipo o fecha
  useEffect(() => {
    if (!typeId || !date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getSlotsForDay(typeId, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [typeId, date]);

  function handleBook() {
    if (!selectedSlot) return;
    setMessage(null);
    startTransition(async () => {
      const res = await createAppointment({
        consultationTypeId: typeId,
        startTime: selectedSlot!,
        modality,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      if (res.flow === "INTAKE") {
        router.push(`/dashboard/patient/appointments/${res.appointmentId}/form`);
        return;
      }
      setMessage("¡Cita de seguimiento creada! Completa el formulario rápido.");
      router.push(`/dashboard/patient/appointments/${res.appointmentId}/form`);
    });
  }

  return (
    <div className="rounded-2xl border border-foreground/10 bg-white p-6">
      <h2 className="text-lg font-bold">Agendar nueva cita</h2>

      {/* Tipo de consulta */}
      <label className="mt-4 block text-sm font-semibold">Tipo de consulta</label>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeId(t.id)}
            className={`rounded-xl border p-3 text-left transition ${
              typeId === t.id
                ? "border-primary bg-primary/5"
                : "border-foreground/15 hover:border-primary/40"
            }`}
          >
            <span className="text-xs font-bold text-accent">{t.code}</span>
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-foreground/50">
              {t.durationMinutes} min · ${t.price}
            </div>
          </button>
        ))}
      </div>

      {selectedType?.morningOnly && (
        <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-foreground/70">
          ⓘ {selectedType.name} es solo presencial y en horario matutino (
          {selectedType.morningStart}–{selectedType.morningEnd}).
        </p>
      )}

      {/* Modalidad */}
      <label className="mt-5 block text-sm font-semibold">Modalidad</label>
      <div className="mt-2 flex gap-2">
        {selectedType?.allowsPresencial && (
          <button
            onClick={() => setModality("PRESENCIAL")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              modality === "PRESENCIAL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            Presencial
          </button>
        )}
        {selectedType?.allowsOnline && (
          <button
            onClick={() => setModality("ONLINE")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              modality === "ONLINE"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            Online
          </button>
        )}
      </div>

      {/* Fecha */}
      <label className="mt-5 block text-sm font-semibold">Fecha</label>
      <input
        type="date"
        value={date}
        min={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        className="mt-2 rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
      />

      {/* Slots */}
      <label className="mt-5 block text-sm font-semibold">
        Horarios disponibles
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {loadingSlots && (
          <span className="text-sm text-foreground/50">Cargando…</span>
        )}
        {!loadingSlots && slots.length === 0 && (
          <span className="text-sm text-foreground/50">
            No hay horarios disponibles ese día.
          </span>
        )}
        {!loadingSlots &&
          slots.map((s) => (
            <button
              key={s.start}
              onClick={() => setSelectedSlot(s.start)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                selectedSlot === s.start
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 hover:border-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
      )}

      <button
        onClick={handleBook}
        disabled={!selectedSlot || isPending}
        className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.01] disabled:opacity-50"
      >
        {isPending ? "Agendando…" : "Confirmar cita"}
      </button>
    </div>
  );
}
