"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clinicTodayDateKey } from "@/lib/clinic-timezone";
import {
  INTERNAL_EVENT_DURATIONS,
  INTERNAL_EVENT_KINDS,
  internalEventKindLabels,
  internalEventKindShortLabels,
  type InternalEventKind,
} from "@/lib/internal-event";
import type { PatientListItem } from "@/server/actions/patient.queries";
import {
  deleteInternalEvent,
  markInternalEventCharge,
  resendInternalEventInvite,
  upsertInternalEvent,
  type InternalEventDTO,
} from "@/server/actions/internal-event.actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary";

type AttendeeType = "NONE" | "PATIENT" | "GUEST";

const ATTENDEE_OPTIONS: { id: AttendeeType; label: string; hint: string }[] = [
  {
    id: "NONE",
    label: "Solo para mí",
    hint: "Ocupa el horario en tu agenda. No se le avisa a nadie.",
  },
  {
    id: "PATIENT",
    label: "Un paciente de Anttova",
    hint: "Recibe el aviso en su panel y por correo.",
  },
  {
    id: "GUEST",
    label: "Alguien de afuera",
    hint: "Solo hace falta su correo; no necesita tener cuenta.",
  },
];

function emptyForm() {
  return {
    title: "",
    description: "",
    kind: "MEETING" as InternalEventKind,
    dateStr: clinicTodayDateKey(),
    startTime: "10:00",
    durationMinutes: 60,
    modality: "ONLINE" as "ONLINE" | "PRESENCIAL",
    location: "",
    attendeeType: "NONE" as AttendeeType,
    patientId: "",
    guestName: "",
    guestEmail: "",
    withCharge: false,
    chargeAmount: "",
    chargeCurrency: "ARS",
    notifyAttendee: true,
  };
}

function fmtEventWhen(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function minutesBetween(start: string, end: string) {
  return Math.max(
    5,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000),
  );
}

/** HH:mm en hora de la clínica, para precargar el formulario al editar. */
function clinicTimeParts(iso: string) {
  const date = new Date(iso);
  const dateStr = date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const time = date.toLocaleTimeString("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { dateStr, startTime: time.slice(0, 5) };
}

/**
 * Agenda propia de la nutricionista: seguimientos incluidos en un pack,
 * consultas extra, reuniones con colegas o espacios personales.
 *
 * Estos eventos ocupan el horario pero nunca se ofrecen para reservar ni
 * generan un cobro, salvo que ella marque un arancel a propósito.
 */
export function InternalEventsPanel({
  events: initialEvents,
  patients,
  openEventId,
  onOpenEventHandled,
}: {
  events: InternalEventDTO[];
  patients: PatientListItem[];
  /** Evento a abrir en modo edición (p. ej. al tocarlo en el calendario). */
  openEventId?: string | null;
  onOpenEventHandled?: () => void;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.end).getTime() >= now);
  }, [events]);

  function startEdit(event: InternalEventDTO) {
    const { dateStr, startTime } = clinicTimeParts(event.start);
    setEditingId(event.id);
    setExpanded(true);
    setMessage(null);
    setForm({
      title: event.title,
      description: event.description ?? "",
      kind: (INTERNAL_EVENT_KINDS as readonly string[]).includes(event.kind)
        ? (event.kind as InternalEventKind)
        : "MEETING",
      dateStr,
      startTime,
      durationMinutes: minutesBetween(event.start, event.end),
      modality: event.modality === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE",
      location: event.location ?? "",
      attendeeType: event.patientId
        ? "PATIENT"
        : event.attendeeEmail
          ? "GUEST"
          : "NONE",
      patientId: event.patientId ?? "",
      guestName: event.isGuest ? (event.attendeeName ?? "") : "",
      guestEmail: event.isGuest ? (event.attendeeEmail ?? "") : "",
      withCharge: Boolean(event.chargeAmount && Number(event.chargeAmount) > 0),
      chargeAmount: event.chargeAmount ?? "",
      chargeCurrency: event.chargeCurrency,
      notifyAttendee: true,
    });
  }

  useEffect(() => {
    if (!openEventId) return;
    const event = events.find((e) => e.id === openEventId);
    if (event) startEdit(event);
    onOpenEventHandled?.();
    // startEdit es estable para este uso; seguir a openEventId alcanza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEventId, events]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await upsertInternalEvent({
        id: editingId ?? undefined,
        title: form.title,
        description: form.description || undefined,
        kind: form.kind,
        dateStr: form.dateStr,
        startTime: form.startTime,
        durationMinutes: form.durationMinutes,
        modality: form.modality,
        location: form.location || undefined,
        attendeeType: form.attendeeType,
        patientId: form.patientId || undefined,
        guestName: form.guestName || undefined,
        guestEmail: form.guestEmail || undefined,
        chargeAmount: form.withCharge ? Number(form.chargeAmount || 0) : 0,
        chargeCurrency: form.chargeCurrency,
        notifyAttendee: form.notifyAttendee,
      });

      if (!res.ok) {
        setMessage({ tone: "error", text: res.message });
        return;
      }

      setMessage({
        tone: "ok",
        text: editingId
          ? "Evento actualizado."
          : form.attendeeType !== "NONE" && form.notifyAttendee
            ? "Evento agendado y aviso enviado."
            : "Evento agendado.",
      });
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(event: InternalEventDTO) {
    const hasAttendee = Boolean(event.attendeeEmail);
    const confirmed = window.confirm(
      hasAttendee
        ? `¿Cancelar «${event.title}»? Le vamos a avisar a ${event.attendeeName ?? event.attendeeEmail}.`
        : `¿Eliminar «${event.title}» de tu agenda?`,
    );
    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const res = await deleteInternalEvent({ id: event.id, notify: true });
      setMessage(
        res.ok
          ? { tone: "ok", text: "Evento eliminado de la agenda." }
          : { tone: "error", text: res.message },
      );
      if (res.ok) {
        if (editingId === event.id) resetForm();
        router.refresh();
      }
    });
  }

  function handleToggleCharge(event: InternalEventDTO) {
    setMessage(null);
    startTransition(async () => {
      const res = await markInternalEventCharge({
        id: event.id,
        paid: !event.chargePaid,
      });
      setMessage(
        res.ok
          ? {
              tone: "ok",
              text: event.chargePaid
                ? "Marcado como pendiente de cobro."
                : "Marcado como cobrado.",
            }
          : { tone: "error", text: res.message },
      );
      if (res.ok) router.refresh();
    });
  }

  function handleResend(event: InternalEventDTO) {
    setMessage(null);
    startTransition(async () => {
      const res = await resendInternalEventInvite(event.id);
      setMessage(
        res.ok
          ? { tone: "ok", text: "Invitación reenviada." }
          : { tone: "error", text: res.message },
      );
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="mt-4 rounded-2xl border border-foreground/10 bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            Agenda propia
          </p>
          <h2 className="mt-0.5 text-base font-bold sm:text-lg">
            Eventos sin reserva ni cobro
          </h2>
          <p className="mt-1 max-w-xl text-xs text-foreground/55">
            Seguimientos incluidos en un pack, consultas extra, reuniones con
            colegas o tu propio tiempo. Ocupan el horario para que nadie los
            reserve, y al participante le llega la invitación con la opción de
            agregarlo a su calendario.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {upcoming.length > 0 && (
            <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
              {upcoming.length} por venir
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (expanded) resetForm();
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {expanded ? "Cerrar" : "+ Nuevo evento"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role="alert"
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
            message.tone === "ok"
              ? "bg-green-50 text-green-800 ring-1 ring-green-200"
              : "bg-red-50 text-red-700 ring-1 ring-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      {expanded && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-2xl border border-primary/15 bg-white p-4 sm:p-5"
        >
          <h3 className="text-sm font-bold">
            {editingId ? "Editar evento" : "Nuevo evento"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">Título</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Seguimiento pack trimestral · Laura"
                className={inputClass}
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Motivo</span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as InternalEventKind,
                  })
                }
                className={inputClass}
              >
                {INTERNAL_EVENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {internalEventKindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Modalidad</span>
              <select
                value={form.modality}
                onChange={(e) =>
                  setForm({
                    ...form,
                    modality: e.target.value as "ONLINE" | "PRESENCIAL",
                  })
                }
                className={inputClass}
              >
                <option value="ONLINE">Online</option>
                <option value="PRESENCIAL">Presencial</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Fecha</span>
              <input
                required
                type="date"
                value={form.dateStr}
                onChange={(e) => setForm({ ...form, dateStr: e.target.value })}
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold">Hora</span>
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Duración</span>
                <select
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                >
                  {INTERNAL_EVENT_DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes < 60
                        ? `${minutes} min`
                        : `${minutes / 60} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">
                {form.modality === "ONLINE"
                  ? "Enlace de la videollamada"
                  : "Lugar"}{" "}
                <span className="font-normal text-foreground/45">
                  (opcional)
                </span>
              </span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder={
                  form.modality === "ONLINE"
                    ? "https://meet.google.com/…"
                    : "Consultorio, dirección…"
                }
                className={inputClass}
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold">
                Descripción{" "}
                <span className="font-normal text-foreground/45">
                  (opcional)
                </span>
              </span>
              <span className="mt-0.5 block text-xs font-normal text-foreground/55">
                Se incluye en el correo de invitación.
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className={inputClass}
                placeholder="Ej: Repasamos el plan y ajustamos porciones."
              />
            </label>
          </div>

          <fieldset className="rounded-xl border border-foreground/10 p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-foreground/50">
              ¿Quién participa?
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {ATTENDEE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                    form.attendeeType === option.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-foreground/10 hover:border-primary/20"
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="attendeeType"
                      checked={form.attendeeType === option.id}
                      onChange={() =>
                        setForm({ ...form, attendeeType: option.id })
                      }
                    />
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-foreground/55">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>

            {form.attendeeType === "PATIENT" && (
              <label className="mt-3 block text-sm">
                <span className="font-semibold">Paciente</span>
                <select
                  value={form.patientId}
                  onChange={(e) =>
                    setForm({ ...form, patientId: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Elegí un paciente…</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} · {patient.email}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {form.attendeeType === "GUEST" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-semibold">
                    Nombre{" "}
                    <span className="font-normal text-foreground/45">
                      (opcional)
                    </span>
                  </span>
                  <input
                    value={form.guestName}
                    onChange={(e) =>
                      setForm({ ...form, guestName: e.target.value })
                    }
                    placeholder="Lic. Juan Pérez"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Correo</span>
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) =>
                      setForm({ ...form, guestEmail: e.target.value })
                    }
                    placeholder="colega@ejemplo.com"
                    className={inputClass}
                  />
                </label>
              </div>
            )}

            {form.attendeeType !== "NONE" && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyAttendee}
                  onChange={(e) =>
                    setForm({ ...form, notifyAttendee: e.target.checked })
                  }
                />
                Enviar la invitación por correo ahora
              </label>
            )}
          </fieldset>

          <fieldset className="rounded-xl border border-foreground/10 p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-foreground/50">
              Cobro
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.withCharge}
                onChange={(e) =>
                  setForm({ ...form, withCharge: e.target.checked })
                }
              />
              Este evento tiene un arancel
            </label>
            <p className="mt-1 text-xs text-foreground/55">
              Sin marcar, el evento va sin cargo: no genera deuda ni pago
              pendiente para el paciente.
            </p>

            {form.withCharge && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold">Importe</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.chargeAmount}
                    onChange={(e) =>
                      setForm({ ...form, chargeAmount: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Moneda</span>
                  <select
                    value={form.chargeCurrency}
                    onChange={(e) =>
                      setForm({ ...form, chargeCurrency: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPending
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Agendar evento"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold text-foreground/70"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      {upcoming.length > 0 && (
        <ul className="mt-4 space-y-2">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/8 bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {event.title}
                  </span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {internalEventKindShortLabels[
                      event.kind as InternalEventKind
                    ] ?? "Evento"}
                  </span>
                  {event.chargeAmount &&
                    Number(event.chargeAmount) > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          event.chargePaid
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {event.chargeCurrency} {event.chargeAmount}
                        {event.chargePaid ? " · cobrado" : " · a cobrar"}
                      </span>
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground/55">
                  {fmtEventWhen(event.start)}
                  {event.attendeeName || event.attendeeEmail
                    ? ` · ${event.attendeeName || event.attendeeEmail}`
                    : " · solo en tu agenda"}
                  {event.isGuest ? " (invitado externo)" : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startEdit(event)}
                  className="text-xs font-semibold text-primary disabled:opacity-50"
                >
                  Editar
                </button>
                {event.attendeeEmail && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleResend(event)}
                    className="text-xs font-semibold text-foreground/60 disabled:opacity-50"
                  >
                    Reenviar invitación
                  </button>
                )}
                {event.chargeAmount && Number(event.chargeAmount) > 0 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleCharge(event)}
                    className="text-xs font-semibold text-foreground/60 disabled:opacity-50"
                  >
                    {event.chargePaid
                      ? "Marcar sin cobrar"
                      : "Marcar cobrado"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(event)}
                  className="text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!expanded && upcoming.length === 0 && (
        <p className="mt-3 text-sm text-foreground/50">
          Todavía no tenés eventos propios agendados.
        </p>
      )}
    </section>
  );
}
