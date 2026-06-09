"use client";

import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { es } from "date-fns/locale/es";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import {
  appointmentsOnDay,
  getMonthWeeks,
} from "@/components/calendar/calendar-utils";
import { statusUi } from "@/components/calendar/calendar-status";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarMonthView({
  month,
  selected,
  appointments,
  onSelectDay,
}: {
  month: Date;
  selected: Date;
  appointments: AppointmentDTO[];
  onSelectDay: (day: Date) => void;
}) {
  const weeks = getMonthWeeks(month);

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/8 bg-surface">
      <div className="grid grid-cols-7 border-b border-foreground/8 bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-foreground/45"
          >
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid grid-cols-7 border-b border-foreground/6 last:border-b-0"
        >
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const selectedDay = isSameDay(day, selected);
            const dayAppts = appointmentsOnDay(appointments, day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`group relative min-h-[88px] border-r border-foreground/6 p-2 text-left transition last:border-r-0 sm:min-h-[110px] ${
                  selectedDay
                    ? "bg-primary/8 ring-1 ring-inset ring-primary/25"
                    : today
                      ? "bg-accent-soft/25"
                      : inMonth
                        ? "hover:bg-muted/40"
                        : "bg-muted/15 text-foreground/35"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    selectedDay
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : today
                        ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                        : ""
                  }`}
                >
                  {format(day, "d")}
                </span>

                <div className="mt-1 space-y-1">
                  {dayAppts.slice(0, 3).map((a) => {
                    const ui = statusUi(a.status);
                    return (
                      <div
                        key={a.id}
                        className={`truncate rounded-lg px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${ui.badge}`}
                      >
                        {format(new Date(a.start), "HH:mm")}{" "}
                        {a.patientName?.split(" ")[0] ?? a.title.split(" ")[0]}
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && (
                    <p className="text-[10px] font-bold text-primary">
                      +{dayAppts.length - 3} más
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
