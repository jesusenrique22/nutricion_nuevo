"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  WEEKDAY_OPTIONS,
  weekdayLabel,
} from "@/lib/scheduling-dates";
import type {
  BlockedDayDTO,
  RecurringBlockedWeekdayDTO,
  ScheduleBlockDTO,
} from "@/server/actions/schedule-block.actions";
import {
  createBlockedDays,
  createRecurringBlockedWeekdays,
  createScheduleBlock,
  deleteBlockedDay,
  deleteRecurringBlockedWeekday,
  deleteScheduleBlock,
} from "@/server/actions/schedule-block.actions";

function todayStr() {
  // Fecha local (no UTC): toISOString() puede devolver el día equivocado según la zona.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtBlock(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

type BlockMode = "dates" | "weekdays" | "hours";

export function ScheduleBlocksPanel({
  blockedDays: initialBlockedDays,
  recurringWeekdays: initialRecurring,
  blocks: initialBlocks,
}: {
  blockedDays: BlockedDayDTO[];
  recurringWeekdays: RecurringBlockedWeekdayDTO[];
  blocks: ScheduleBlockDTO[];
}) {
  const router = useRouter();
  const [blockedDays, setBlockedDays] = useState(initialBlockedDays);
  const [recurringWeekdays, setRecurringWeekdays] = useState(initialRecurring);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<BlockMode>("dates");

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [dayReason, setDayReason] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [weekdayReason, setWeekdayReason] = useState("");
  const [weekdayScope, setWeekdayScope] = useState<"full" | "partial">("full");
  const [weekdayStart, setWeekdayStart] = useState("08:00");
  const [weekdayEnd, setWeekdayEnd] = useState("13:00");

  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBlockedDays(initialBlockedDays);
  }, [initialBlockedDays]);

  useEffect(() => {
    setRecurringWeekdays(initialRecurring);
  }, [initialRecurring]);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  function toggleWeekday(value: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value],
    );
  }

  function handleBlockDays(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createBlockedDays({
        fromDate,
        toDate: toDate !== fromDate ? toDate : undefined,
        reason: dayReason.trim() || undefined,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setDayReason("");
      setMessage(
        res.count && res.count > 1
          ? `${res.count} días bloqueados.`
          : "Día bloqueado.",
      );
      router.refresh();
    });
  }

  function handleBlockWeekdays(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (selectedWeekdays.length === 0) {
      setMessage("Elegí al menos un día de la semana.");
      return;
    }
    startTransition(async () => {
      const res = await createRecurringBlockedWeekdays({
        weekdays: selectedWeekdays,
        reason: weekdayReason.trim() || undefined,
        ...(weekdayScope === "partial"
          ? { startTime: weekdayStart, endTime: weekdayEnd }
          : {}),
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setSelectedWeekdays([]);
      setWeekdayReason("");
      setMessage(
        weekdayScope === "partial"
          ? res.count && res.count > 1
            ? `${res.count} días: franja ${weekdayStart}–${weekdayEnd} bloqueada.`
            : `Franja ${weekdayStart}–${weekdayEnd} bloqueada de forma fija.`
          : res.count && res.count > 1
            ? `${res.count} días de la semana bloqueados de forma fija.`
            : "Día de la semana bloqueado de forma fija.",
      );
      router.refresh();
    });
  }

  function handleCreatePartial(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createScheduleBlock({
        dateStr: date,
        startTime,
        endTime,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setReason("");
      setMessage("Horario bloqueado.");
      router.refresh();
    });
  }

  function handleDeleteDay(id: string) {
    if (!confirm("¿Eliminar este día bloqueado?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteBlockedDay({ id });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setBlockedDays((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    });
  }

  function handleDeleteRecurring(id: string) {
    if (!confirm("¿Eliminar este bloqueo recurrente?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteRecurringBlockedWeekday({ id });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setRecurringWeekdays((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    });
  }

  function handleDeleteBlock(id: string) {
    if (!confirm("¿Eliminar este bloqueo de horario?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteScheduleBlock({ id });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    });
  }

  const modeBtn = (id: BlockMode, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setMode(id)}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        mode === id
          ? "bg-primary text-primary-foreground"
          : "border border-foreground/15 bg-white hover:bg-muted/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-4 rounded-2xl border border-foreground/10 bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
      >
        <div>
          <p className="text-sm font-bold">Días y horarios sin atención</p>
          <p className="text-xs text-foreground/50">
            Fechas puntuales, días fijos de la semana (completos o por franja) u
            horas sueltas
          </p>
        </div>
        <span className="text-sm text-foreground/40">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-foreground/8 px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {modeBtn("dates", "Fechas puntuales")}
            {modeBtn("weekdays", "Todos los…")}
            {modeBtn("hours", "Solo horas")}
          </div>

          {mode === "dates" && (
            <form onSubmit={handleBlockDays} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    min={todayStr()}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      if (e.target.value > toDate) setToDate(e.target.value);
                    }}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Hasta (opcional)
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] text-foreground/45">
                    Dejalo igual al inicio para un solo día
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={dayReason}
                    onChange={(e) => setDayReason(e.target.value)}
                    placeholder="Ej. Vacaciones"
                    maxLength={200}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Bloquear días"}
              </button>
            </form>
          )}

          {mode === "weekdays" && (
            <form onSubmit={handleBlockWeekdays} className="space-y-3">
              <p className="text-sm text-foreground/60">
                Se aplica a <strong>todos</strong> esos días de la semana hasta
                que los habilites. Podés cerrar el día entero o solo una franja
                (ej. jueves mañana cerrado, tarde libre).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWeekdayScope("full")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    weekdayScope === "full"
                      ? "bg-primary text-primary-foreground"
                      : "border border-foreground/15 bg-white"
                  }`}
                >
                  Día completo
                </button>
                <button
                  type="button"
                  onClick={() => setWeekdayScope("partial")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    weekdayScope === "partial"
                      ? "bg-primary text-primary-foreground"
                      : "border border-foreground/15 bg-white"
                  }`}
                >
                  Solo franja horaria
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const active = selectedWeekdays.includes(day.value);
                  const already = recurringWeekdays.some(
                    (r) => r.weekday === day.value,
                  );
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={isPending}
                      onClick={() => toggleWeekday(day.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : already
                            ? "border border-primary/40 bg-primary/5 text-primary"
                            : "border border-foreground/15 bg-white hover:bg-muted/40"
                      }`}
                    >
                      {day.short}
                      {already && !active ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
              {weekdayScope === "partial" && (
                <div className="grid max-w-md gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground/60">
                      Desde
                    </label>
                    <input
                      type="time"
                      value={weekdayStart}
                      onChange={(e) => setWeekdayStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/60">
                      Hasta
                    </label>
                    <input
                      type="time"
                      value={weekdayEnd}
                      onChange={(e) => setWeekdayEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-foreground/45">
                    Ejemplo: 08:00–13:00 deja libres las citas de la tarde.
                  </p>
                </div>
              )}
              <div className="max-w-sm">
                <label className="text-xs font-semibold text-foreground/60">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={weekdayReason}
                  onChange={(e) => setWeekdayReason(e.target.value)}
                  placeholder="Ej. Mañana sin atención"
                  maxLength={200}
                  className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || selectedWeekdays.length === 0}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Bloquear días elegidos"}
              </button>
            </form>
          )}

          {mode === "hours" && (
            <form onSubmit={handleCreatePartial} className="space-y-3">
              <p className="text-sm text-foreground/60">
                Bloqueá solo algunas horas de una fecha concreta (reunión,
                turno médico, etc.). El resto del día sigue disponible.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Desde
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Hasta
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Reunión"
                    maxLength={200}
                    className="mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Bloquear horario"}
              </button>
            </form>
          )}

          {recurringWeekdays.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/55">
                Todos los… (fijos)
              </h3>
              <ul className="mt-2 space-y-2">
                {recurringWeekdays.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-amber-50/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold">
                        Todos los {weekdayLabel(r.weekday).toLowerCase()}
                      </span>
                      {r.startTime && r.endTime ? (
                        <span className="ml-2 text-foreground/60">
                          · {r.startTime}–{r.endTime}
                        </span>
                      ) : (
                        <span className="ml-2 text-foreground/45">
                          · día completo
                        </span>
                      )}
                      {r.reason && (
                        <span className="ml-2 text-foreground/50">
                          · {r.reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteRecurring(r.id)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Habilitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blockedDays.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/55">
                Fechas puntuales
              </h3>
              <ul className="mt-2 space-y-2">
                {blockedDays.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-red-50/40 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold capitalize">
                        {fmtDay(d.date)}
                      </span>
                      {d.reason && (
                        <span className="ml-2 text-foreground/50">
                          · {d.reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteDay(d.id)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Habilitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blocks.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/55">
                Horarios parciales
              </h3>
              <ul className="mt-2 space-y-2">
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold">
                        {fmtBlock(b.start)} –{" "}
                        {new Date(b.end).toLocaleTimeString("es", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Argentina/Buenos_Aires",
                        })}
                      </span>
                      {b.reason && (
                        <span className="ml-2 text-foreground/50">
                          · {b.reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteBlock(b.id)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blockedDays.length === 0 &&
            recurringWeekdays.length === 0 &&
            blocks.length === 0 && (
              <p className="mt-4 text-sm text-foreground/50">
                No hay bloqueos de agenda.
              </p>
            )}

          {message && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
