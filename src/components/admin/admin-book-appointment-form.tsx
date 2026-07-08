"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import { getSlotsForDay } from "@/server/actions/booking.queries";
import { createAppointmentForPatient } from "@/server/actions/appointment.actions";
import type { Slot } from "@/server/services/availability.service";
import { LoadingInline } from "@/components/ui/loading-indicator";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminBookAppointmentForm({
  patientId,
  consultationTypes,
}: {
  patientId: string;
  consultationTypes: ConsultationTypeDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(consultationTypes[0]?.id ?? "");
  const [modality, setModality] = useState<"ONLINE" | "PRESENCIAL">("PRESENCIAL");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = consultationTypes.find((t) => t.id === typeId);

  useEffect(() => {
    if (!open || !typeId || !date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getSlotsForDay(typeId, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [open, typeId, date]);

  useEffect(() => {
    if (!selectedType) return;
    if (modality === "ONLINE" && !selectedType.allowsOnline) {
      setModality("PRESENCIAL");
    } else if (modality === "PRESENCIAL" && !selectedType.allowsPresencial) {
      setModality("ONLINE");
    }
  }, [typeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (!selectedSlot || !typeId) return;
    setMessage(null);
    startTransition(async () => {
      const res = await createAppointmentForPatient({
        patientId,
        consultationTypeId: typeId,
        startTime: selectedSlot,
        modality,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setOpen(false);
      setSelectedSlot(null);
      setMessage("Cita agendada.");
      router.refresh();
    });
  }

  if (consultationTypes.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Agendar cita para este paciente
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">Nueva cita</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-foreground/50 hover:text-primary"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/60">
              Tipo de consulta
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {consultationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div className="flex flex-wrap gap-2">
              {selectedType.allowsPresencial && (
                <button
                  type="button"
                  onClick={() => setModality("PRESENCIAL")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    modality === "PRESENCIAL"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  Presencial
                </button>
              )}
              {selectedType.allowsOnline && (
                <button
                  type="button"
                  onClick={() => setModality("ONLINE")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    modality === "ONLINE"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  Online
                </button>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground/60">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground/60">Horario</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {loadingSlots && <LoadingInline label="Buscando horarios…" />}
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
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
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message === "Cita agendada."
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="button"
            disabled={!selectedSlot || isPending}
            onClick={handleSubmit}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Confirmar cita"}
          </button>
        </div>
      )}
    </div>
  );
}
