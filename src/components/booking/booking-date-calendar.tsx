"use client";

import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale/es";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMonthWeeks } from "@/components/calendar/calendar-utils";
import { getUnavailableBookingDates } from "@/server/actions/booking.queries";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function toKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function BookingDateCalendar({
  value,
  onChange,
  minDate,
  blockedDates: blockedFromParent,
  coverageFrom,
  coverageTo,
  onNeedRange,
}: {
  value: string;
  onChange: (dateKey: string) => void;
  minDate?: string;
  /** Set precargado — si falta, el calendario pide el mes al abrir. */
  blockedDates?: ReadonlySet<string>;
  coverageFrom?: string;
  coverageTo?: string;
  onNeedRange?: (from: string, to: string) => void;
}) {
  const selected = useMemo(() => parseKey(value), [value]);
  const min = useMemo(
    () => startOfDay(parseKey(minDate ?? toKey(new Date()))),
    [minDate],
  );
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(selected));
  const [fetchedBlocked, setFetchedBlocked] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef<string | null>(null);
  const seeded = blockedFromParent !== undefined;

  const blocked = blockedFromParent ?? fetchedBlocked;
  const label = format(selected, "EEEE d 'de' MMMM yyyy", { locale: es });

  useEffect(() => {
    setMonth(startOfMonth(selected));
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !onNeedRange || !coverageFrom || !coverageTo) return;
    const start = startOfWeek(startOfMonth(month), {
      locale: es,
      weekStartsOn: 1,
    });
    const end = endOfWeek(endOfMonth(month), { locale: es, weekStartsOn: 1 });
    const from = toKey(start);
    const to = toKey(end);
    if (from >= coverageFrom && to <= coverageTo) return;
    const key = `${from}:${to}`;
    if (requestedRef.current === key) return;
    requestedRef.current = key;
    onNeedRange(from, to);
  }, [month, open, coverageFrom, coverageTo, onNeedRange]);

  useEffect(() => {
    if (!open || seeded) return;
    const start = startOfWeek(startOfMonth(month), {
      locale: es,
      weekStartsOn: 1,
    });
    const end = endOfWeek(endOfMonth(month), { locale: es, weekStartsOn: 1 });
    let cancelled = false;
    setLoading(true);
    getUnavailableBookingDates({
      from: toKey(start),
      to: toKey(end),
    })
      .then((dates) => {
        if (cancelled) return;
        setFetchedBlocked(new Set(dates));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, open, seeded]);

  useEffect(() => {
    if (!blocked.has(value)) return;
    const cursor = parseKey(value);
    for (let i = 0; i < 60; i++) {
      cursor.setDate(cursor.getDate() + 1);
      const key = toKey(cursor);
      if (!blocked.has(key) && !isBefore(startOfDay(cursor), min)) {
        onChange(key);
        break;
      }
    }
  }, [blocked, value, min, onChange]);

  const weeks = getMonthWeeks(month);

  function selectDay(day: Date) {
    const key = toKey(day);
    if (blocked.has(key)) return;
    if (isBefore(startOfDay(day), min)) return;
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-foreground/15 bg-white px-4 py-3 text-left text-sm outline-none transition hover:border-primary/40 focus:border-primary"
      >
        <span className="min-w-0 capitalize text-foreground">{label}</span>
        <span className="shrink-0 text-foreground/40" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-foreground/15 bg-white p-3 shadow-lg ring-1 ring-foreground/5">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-foreground/60 transition hover:bg-muted hover:text-primary"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <p className="text-sm font-bold capitalize text-foreground">
              {format(month, "MMMM yyyy", { locale: es })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-foreground/60 transition hover:bg-muted hover:text-primary"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/40"
              >
                {d}
              </span>
            ))}
            {weeks.flat().map((day) => {
              const key = toKey(day);
              const inMonth = isSameMonth(day, month);
              const selectedDay = isSameDay(day, selected);
              const today = isToday(day);
              const isBlocked = blocked.has(key);
              const past = isBefore(startOfDay(day), min);
              const disabled = isBlocked || past;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  title={
                    isBlocked
                      ? "Sin atención este día"
                      : past
                        ? "Fecha pasada"
                        : undefined
                  }
                  className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition ${
                    selectedDay && !isBlocked
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isBlocked
                        ? "cursor-not-allowed bg-red-100 text-red-600 line-through decoration-red-400"
                        : past
                          ? "cursor-not-allowed text-foreground/25"
                          : today
                            ? "bg-accent-soft/50 text-primary ring-1 ring-primary/25 hover:bg-accent-soft"
                            : inMonth
                              ? "text-foreground hover:bg-muted"
                              : "text-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] text-foreground/50">
            {loading ? (
              "Actualizando disponibilidad…"
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-sm bg-red-100 ring-1 ring-red-300 align-middle" />{" "}
                en rojo = sin atención
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
