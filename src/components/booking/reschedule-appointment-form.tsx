"use client";

import { useEffect, useState, useTransition } from "react";
import { getRescheduleSlots } from "@/server/actions/booking.queries";
import { rescheduleAppointment } from "@/server/actions/appointment-status.actions";
import type { Slot } from "@/server/services/availability.service";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function RescheduleAppointmentForm({
  appointmentId,
  onDone,
  onCancel,
}: {
  appointmentId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    getRescheduleSlots(appointmentId, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [appointmentId, date]);

  function handleSubmit() {
    if (!selectedSlot) return;
    setMessage(null);
    startTransition(async () => {
      const res = await rescheduleAppointment({
        appointmentId,
        startTime: selectedSlot,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">Nueva fecha</label>
      <input
        type="date"
        value={date}
        min={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div>
        <p className="text-sm font-semibold">Horario disponible</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {loadingSlots && (
            <span className="text-sm text-foreground/50">Cargando…</span>
          )}
          {!loadingSlots && slots.length === 0 && (
            <span className="text-sm text-foreground/50">
              No hay horarios ese día.
            </span>
          )}
          {!loadingSlots &&
            slots.map((s) => (
              <button
                key={s.start}
                type="button"
                onClick={() => setSelectedSlot(s.start)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedSlot === s.start
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent-soft"
                }`}
              >
                {s.label}
              </button>
            ))}
        </div>
      </div>

      {message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!selectedSlot || isPending}
          onClick={handleSubmit}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Confirmar nuevo horario"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
