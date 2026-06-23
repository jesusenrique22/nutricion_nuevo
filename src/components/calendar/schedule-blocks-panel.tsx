"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  BlockedDayDTO,
  ScheduleBlockDTO,
} from "@/server/actions/schedule-block.actions";
import {
  createBlockedDays,
  createScheduleBlock,
  deleteBlockedDay,
  deleteScheduleBlock,
} from "@/server/actions/schedule-block.actions";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
  });
}

export function ScheduleBlocksPanel({
  blockedDays: initialBlockedDays,
  blocks: initialBlocks,
}: {
  blockedDays: BlockedDayDTO[];
  blocks: ScheduleBlockDTO[];
}) {
  const router = useRouter();
  const [blockedDays, setBlockedDays] = useState(initialBlockedDays);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [expanded, setExpanded] = useState(false);
  const [showPartial, setShowPartial] = useState(false);

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [dayReason, setDayReason] = useState("");

  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBlockedDays(initialBlockedDays);
  }, [initialBlockedDays]);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  function handleBlockDays(e: React.FormEvent) {
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

  function handleCreatePartial(e: React.FormEvent) {
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

  function handleDeleteBlock(id: string) {
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

  return (
    <div className="mt-4 rounded-2xl border border-foreground/10 bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
      >
        <div>
          <p className="text-sm font-bold">Días sin atención</p>
          <p className="text-xs text-foreground/50">
            Bloqueá fechas en las que no se pueden agendar citas
          </p>
        </div>
        <span className="text-sm text-foreground/40">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-foreground/8 px-4 py-4 sm:px-5">
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

          {blockedDays.length > 0 && (
            <ul className="mt-4 space-y-2">
              {blockedDays.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-red-50/40 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold capitalize">{fmtDay(d.date)}</span>
                    {d.reason && (
                      <span className="ml-2 text-foreground/50">· {d.reason}</span>
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
          )}

          {blockedDays.length === 0 && (
            <p className="mt-4 text-sm text-foreground/50">
              No hay días bloqueados próximos.
            </p>
          )}

          <div className="mt-6 border-t border-foreground/8 pt-4">
            <button
              type="button"
              onClick={() => setShowPartial((v) => !v)}
              className="text-sm font-semibold text-foreground/70 hover:text-primary"
            >
              {showPartial ? "▲ Ocultar bloqueo por horario" : "▼ Bloqueo parcial (solo algunas horas)"}
            </button>

            {showPartial && (
              <form onSubmit={handleCreatePartial} className="mt-3 space-y-3">
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
                  className="rounded-full border border-foreground/20 px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Bloquear horario"}
                </button>

                {blocks.length > 0 && (
                  <ul className="space-y-2">
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
                )}
              </form>
            )}
          </div>

          {message && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
