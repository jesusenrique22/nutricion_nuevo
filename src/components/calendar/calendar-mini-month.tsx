"use client";

import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale/es";
import {
  countByDay,
  dayKey,
  getMonthWeeks,
} from "@/components/calendar/calendar-utils";
import type { AppointmentDTO } from "@/server/actions/booking.queries";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function CalendarMiniMonth({
  month,
  selected,
  appointments,
  onSelectDay,
  onChangeMonth,
  compact = false,
}: {
  month: Date;
  selected: Date;
  appointments: AppointmentDTO[];
  onSelectDay: (day: Date) => void;
  onChangeMonth: (month: Date) => void;
  compact?: boolean;
}) {
  const weeks = getMonthWeeks(month);
  const counts = countByDay(appointments);

  return (
    <div
      className={`rounded-xl border border-foreground/8 bg-surface shadow-sm ${compact ? "p-2.5" : "p-4"}`}
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onChangeMonth(subMonths(month, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-foreground/60 transition hover:bg-muted hover:text-primary"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <p className="text-xs font-bold capitalize text-foreground sm:text-sm">
          {format(month, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-foreground/60 transition hover:bg-muted hover:text-primary"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-0.5 text-center ${compact ? "mt-2" : "mt-3"}`}>
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/40"
          >
            {d}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const key = dayKey(day);
          const count = counts.get(key) ?? 0;
          const inMonth = isSameMonth(day, month);
          const selectedDay = isSameDay(day, selected);
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`relative flex items-center justify-center rounded-lg font-semibold transition ${
                compact ? "h-7 w-full text-[11px]" : "aspect-square flex-col rounded-xl text-xs"
              } ${
                selectedDay
                  ? "bg-primary text-primary-foreground shadow-md"
                  : today
                    ? "bg-accent-soft/50 text-primary ring-2 ring-primary/30"
                    : inMonth
                      ? "text-foreground hover:bg-muted"
                      : "text-foreground/25 hover:bg-muted/50"
              }`}
            >
              {format(day, "d")}
              {count > 0 && !selectedDay && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${today ? "bg-primary" : "bg-accent"}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
