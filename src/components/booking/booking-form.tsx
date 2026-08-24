"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { BookingDateCalendar } from "@/components/booking/booking-date-calendar";
import {
  BookingTimezoneSelector,
  SlotTimeLabel,
} from "@/components/booking/booking-timezone-ui";
import { RecaptchaNotice } from "@/components/security/recaptcha-notice";
import { useCurrency } from "@/contexts/currency-context";
import { useBookingTimezone } from "@/contexts/booking-timezone-context";
import { FlowStep, FlowStepDots } from "@/components/motion/flow-step";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import {
  computeSlotsForDay,
  snapshotCoversDate,
  type BookingAvailabilitySnapshot,
  type ComputedSlot,
} from "@/lib/booking-slots";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import { getBookingAvailabilitySnapshot } from "@/server/actions/booking.queries";
import { addAppointmentToCart } from "@/server/actions/cart.actions";
import { clinicTodayDateKey } from "@/lib/clinic-timezone";

type Step = "service" | "details" | "confirm";

export function BookingForm({
  types,
  availability,
}: {
  types: ConsultationTypeDTO[];
  availability: BookingAvailabilitySnapshot;
}) {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { showsClinicReference, clinicTimezoneName } = useBookingTimezone();
  const clinicToday = clinicTodayDateKey();
  const [snapshot, setSnapshot] = useState(availability);
  const [step, setStep] = useState<Step>("service");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [modality, setModality] = useState<"ONLINE" | "PRESENCIAL">(
    "PRESENCIAL",
  );
  const [date, setDate] = useState(clinicToday);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [extending, setExtending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { enabled: recaptchaEnabled, ready: recaptchaReady, loadFailed: recaptchaLoadFailed, getToken } =
    useRecaptcha(undefined, step !== "service");

  const selectedType = types.find((t) => t.id === typeId);
  const stepIndex = step === "service" ? 0 : step === "details" ? 1 : 2;

  const blockedSet = useMemo(
    () => new Set(snapshot.blockedDates),
    [snapshot.blockedDates],
  );

  const slots: ComputedSlot[] = useMemo(() => {
    if (!selectedType || step !== "confirm") return [];
    if (!snapshotCoversDate(snapshot, date)) return [];
    return computeSlotsForDay({
      dateStr: date,
      type: selectedType,
      busy: snapshot.busy,
      blockedDates: blockedSet,
    });
  }, [selectedType, step, date, snapshot, blockedSet]);

  function go(next: Step) {
    setDirection(next === "service" ? -1 : 1);
    setStep(next);
  }

  useEffect(() => {
    setSnapshot(availability);
  }, [availability]);

  useEffect(() => {
    if (!selectedType) return;
    if (modality === "ONLINE" && !selectedType.allowsOnline) {
      setModality("PRESENCIAL");
    } else if (modality === "PRESENCIAL" && !selectedType.allowsPresencial) {
      setModality("ONLINE");
    }
  }, [typeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedSlot(null);
  }, [typeId, date, step]);

  /** Si el usuario navega fuera del rango precargado, extiende el snapshot una sola vez. */
  useEffect(() => {
    if (step !== "confirm" && step !== "details") return;
    if (snapshotCoversDate(snapshot, date)) return;

    let cancelled = false;
    setExtending(true);
    getBookingAvailabilitySnapshot({ from: date, to: date })
      .then((next) => {
        if (cancelled) return;
        setSnapshot((prev) => ({
          from: prev.from < next.from ? prev.from : next.from,
          to: prev.to > next.to ? prev.to : next.to,
          blockedDates: [
            ...new Set([...prev.blockedDates, ...next.blockedDates]),
          ].sort(),
          busy: [...prev.busy, ...next.busy],
        }));
      })
      .finally(() => {
        if (!cancelled) setExtending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, step, snapshot]);

  function handleAddToCart() {
    if (!selectedSlot) return;
    setMessage(null);
    startTransition(async () => {
      let recaptchaToken: string | undefined;

      if (recaptchaEnabled) {
        if (recaptchaLoadFailed) {
          setMessage(
            "No pudimos cargar la verificación de seguridad. Desactivá bloqueadores de anuncios o probá con otra red.",
          );
          return;
        }
        if (!recaptchaReady) {
          setMessage("Cargando verificación de seguridad… Intentá en unos segundos.");
          return;
        }
        const token = await getToken();
        if (!token) {
          setMessage(
            "No pudimos verificar la solicitud. Recargá la página e intentá de nuevo.",
          );
          return;
        }
        recaptchaToken = token;
      }

      const res = await addAppointmentToCart({
        consultationTypeId: typeId,
        startTime: selectedSlot,
        modality,
        recaptchaToken,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      router.push("/dashboard/patient/cart?cita=agregada");
      router.refresh();
    });
  }

  const loadingSlots = extending && !snapshotCoversDate(snapshot, date);

  const extendCoverage = useCallback((from: string, to: string) => {
    setExtending(true);
    getBookingAvailabilitySnapshot({ from, to })
      .then((next) => {
        setSnapshot((prev) => ({
          from: prev.from < next.from ? prev.from : next.from,
          to: prev.to > next.to ? prev.to : next.to,
          blockedDates: [
            ...new Set([...prev.blockedDates, ...next.blockedDates]),
          ].sort(),
          busy: [...prev.busy, ...next.busy],
        }));
      })
      .finally(() => setExtending(false));
  }, []);

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
                subtitle={`${t.durationMinutes} min · ${formatPrice(t.price, "ARS")}`}
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
                {selectedType.morningEnd} hora {clinicTimezoneName})
              </p>
            )}

            <div className="mt-4">
              <BookingTimezoneSelector compact />
            </div>

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
            {showsClinicReference && (
              <p className="mt-1 text-[11px] text-foreground/50">
                El calendario usa la fecha de la clínica ({clinicTimezoneName}).
              </p>
            )}
            <BookingDateCalendar
              value={date}
              minDate={clinicToday}
              onChange={setDate}
              blockedDates={blockedSet}
              coverageFrom={snapshot.from}
              coverageTo={snapshot.to}
              onNeedRange={extendCoverage}
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
            <p className="mt-2 text-center text-sm font-semibold text-primary">
              {formatPrice(selectedType.price, "ARS")}
            </p>

            {showsClinicReference && (
              <p className="mt-2 text-center text-[11px] text-foreground/50">
                Hora grande = tu zona · debajo = hora Argentina de la clínica
              </p>
            )}

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
                    <SlotTimeLabel iso={s.start} />
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
                label={isPending ? "Agregando…" : "Agregar al carrito"}
                onClick={handleAddToCart}
                disabled={!selectedSlot || isPending}
              />
              <p className="text-center text-xs text-foreground/50">
                Podés sumar recursos y pagar todo junto desde el carrito.
              </p>
              <RecaptchaNotice className="text-center" />
              {recaptchaEnabled && (
                <p className="text-center text-[10px] leading-snug text-foreground/45">
                  La verificación es automática en segundo plano; no verás un
                  checkbox.
                </p>
              )}
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
