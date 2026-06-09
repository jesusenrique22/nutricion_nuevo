"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { FlowStep, FlowStepDots } from "@/components/motion/flow-step";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import { getSlotsForDay } from "@/server/actions/booking.queries";
import { createAppointment } from "@/server/actions/appointment.actions";
import type { Slot } from "@/server/services/availability.service";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Step = "service" | "details" | "confirm";

export function BookingForm({ types }: { types: ConsultationTypeDTO[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("service");
  const [direction, setDirection] = useState<1 | -1>(1);
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
  const stepIndex = step === "service" ? 0 : step === "details" ? 1 : 2;

  function go(next: Step) {
    setDirection(next === "service" ? -1 : 1);
    setStep(next);
  }

  useEffect(() => {
    if (!selectedType) return;
    if (modality === "ONLINE" && !selectedType.allowsOnline) {
      setModality("PRESENCIAL");
    } else if (modality === "PRESENCIAL" && !selectedType.allowsPresencial) {
      setModality("ONLINE");
    }
  }, [typeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!typeId || !date || step !== "confirm") return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getSlotsForDay(typeId, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [typeId, date, step]);

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
      router.push("/dashboard/patient/appointments/form?recien=1");
    });
  }

  return (
    <div className="mx-auto w-full max-w-[344px]">
      <FlowStepDots total={3} current={stepIndex} />

      <FlowStep stepKey={step} direction={direction}>
        {step === "service" && (
          <div className="flex flex-col items-center gap-3">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
              Elige tu consulta
            </p>
            {types.map((t, i) => (
              <BrandLinkButton
                key={t.id}
                type="button"
                label={t.name}
                subtitle={`${t.code} · ${t.durationMinutes} min · $${t.price}`}
                selected={typeId === t.id}
                delay={i * 0.06}
                onClick={() => {
                  setTypeId(t.id);
                  go("details");
                }}
              />
            ))}
          </div>
        )}

        {step === "details" && selectedType && (
          <div className="rounded-[28px] bg-white p-5 shadow-md ring-1 ring-foreground/5">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
              Modalidad y fecha
            </p>
            <p className="mt-2 text-center font-semibold text-primary">
              {selectedType.name}
            </p>

            {selectedType.morningOnly && (
              <p className="mt-3 rounded-2xl bg-accent/15 px-3 py-2 text-xs text-foreground/70">
                Solo presencial · horario matutino ({selectedType.morningStart}–
                {selectedType.morningEnd})
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {selectedType.allowsPresencial && (
                <button
                  type="button"
                  onClick={() => setModality("PRESENCIAL")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    modality === "PRESENCIAL"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/70"
                  }`}
                >
                  Presencial
                </button>
              )}
              {selectedType.allowsOnline && (
                <button
                  type="button"
                  onClick={() => setModality("ONLINE")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    modality === "ONLINE"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/70"
                  }`}
                >
                  Online
                </button>
              )}
            </div>

            <label className="mt-5 block text-sm font-semibold">Fecha</label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-foreground/15 px-4 py-3 outline-none focus:border-primary"
            />

            <div className="mt-5 flex flex-col gap-2">
              <BrandLinkButton
                type="button"
                label="Ver horarios"
                onClick={() => go("confirm")}
              />
              <button
                type="button"
                onClick={() => go("service")}
                className="py-2 text-sm font-semibold text-foreground/50 hover:text-primary"
              >
                ← Cambiar consulta
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && selectedType && (
          <div className="rounded-[28px] bg-white p-5 shadow-md ring-1 ring-foreground/5">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
              Horario disponible
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                        : "bg-muted hover:bg-accent/20"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
            </div>

            {message && (
              <p className="mt-4 rounded-2xl bg-muted px-3 py-2 text-sm">
                {message}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <BrandLinkButton
                type="button"
                label={isPending ? "Agendando…" : "Confirmar cita"}
                onClick={handleBook}
                disabled={!selectedSlot || isPending}
              />
              <button
                type="button"
                onClick={() => go("details")}
                className="py-2 text-sm font-semibold text-foreground/50 hover:text-primary"
              >
                ← Volver
              </button>
            </div>
          </div>
        )}
      </FlowStep>
    </div>
  );
}
