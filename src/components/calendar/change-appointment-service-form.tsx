"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getConsultationTypes,
  type ConsultationTypeDTO,
} from "@/server/actions/booking.queries";
import { changeAppointmentService } from "@/server/actions/appointment-status.actions";
import { DisplayPrice } from "@/components/currency/display-price";

export function ChangeAppointmentServiceForm({
  appointmentId,
  currentCode,
  onDone,
  onCancel,
}: {
  appointmentId: string;
  currentCode?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [types, setTypes] = useState<ConsultationTypeDTO[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getConsultationTypes().then((rows) =>
      setTypes(rows.filter((t) => t.code !== currentCode)),
    );
  }, [currentCode]);

  function submit() {
    if (!selectedId) return;
    setMessage(null);
    startTransition(async () => {
      const res = await changeAppointmentService({
        appointmentId,
        consultationTypeId: selectedId,
      });
      if (res.ok) onDone();
      else setMessage(res.message);
    });
  }

  if (!types) {
    return <p className="text-sm text-foreground/50">Cargando servicios…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-foreground/50">
        Se mantiene la fecha y lo que el paciente ya pagó; se ajusta el precio
        y la duración al nuevo servicio.
      </p>
      <div className="space-y-2">
        {types.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="consultationType"
                value={t.id}
                checked={selectedId === t.id}
                onChange={() => setSelectedId(t.id)}
              />
              {t.name}
            </span>
            <span className="text-foreground/60">
              <DisplayPrice amount={t.price} /> · {t.durationMinutes} min
            </span>
          </label>
        ))}
      </div>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!selectedId || isPending}
          onClick={submit}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Cambiar servicio"}
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
