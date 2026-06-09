"use client";

import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale/es";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import {
  appointmentsOnDay,
  formatTime,
  getWeekDays,
} from "@/components/calendar/calendar-utils";
import { statusLabel, statusUi } from "@/components/calendar/calendar-status";

const STATUS_SHORT: Record<string, string> = {
  PENDING: "Pend",
  CONFIRMED: "Conf",
  COMPLETED: "Ok",
  CANCELLED: "Canc",
  NO_SHOW: "N/A",
};

function WeekAppointmentChip({
  appointment,
  onSelect,
}: {
  appointment: AppointmentDTO;
  onSelect?: (a: AppointmentDTO) => void;
}) {
  const ui = statusUi(appointment.status);
  const time = formatTime(appointment.start);
  const name =
    appointment.patientName?.split(" ")[0] ??
    appointment.title.split(" ")[0] ??
    appointment.title;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(appointment)}
      className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:shadow-sm ${ui.card}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold tabular-nums text-primary">
          {time}
        </span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[8px] font-bold uppercase ${ui.badge}`}
        >
          {STATUS_SHORT[appointment.status] ?? statusLabel(appointment.status).slice(0, 4)}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-foreground">
        {name}
      </p>
    </button>
  );
}

export function CalendarWeekView({
  date,
  selected,
  appointments,
  onSelectDay,
  onSelect,
}: {
  date: Date;
  selected: Date;
  appointments: AppointmentDTO[];
  onSelectDay?: (day: Date) => void;
  onSelect?: (a: AppointmentDTO) => void;
}) {
  const days = getWeekDays(date);

  return (
    <div className="anttova-week overflow-hidden rounded-xl border border-foreground/8 bg-surface">
      <div className="grid grid-cols-7 border-b border-foreground/8 bg-muted/25">
        {days.map((day) => {
          const today = isToday(day);
          const isSelected = isSameDay(day, selected);
          const count = appointmentsOnDay(appointments, day).length;

          return (
            <button
              key={`head-${day.toISOString()}`}
              type="button"
              onClick={() => onSelectDay?.(day)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-0.5 border-r border-foreground/6 px-1 py-2 last:border-r-0 transition ${
                isSelected ? "bg-primary/10" : "hover:bg-muted/50"
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide text-foreground/45">
                {format(day, "EEE", { locale: es })}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : today
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              {count > 0 && (
                <span className="text-[9px] font-semibold text-primary/70">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="anttova-week__body grid grid-cols-7 divide-x divide-foreground/6">
        {days.map((day) => {
          const dayAppts = appointmentsOnDay(appointments, day);
          const isSelected = isSameDay(day, selected);

          return (
            <div
              key={`body-${day.toISOString()}`}
              className={`min-h-[4.5rem] p-1.5 sm:p-2 ${
                isSelected ? "bg-primary/[0.04]" : ""
              }`}
            >
              {dayAppts.length === 0 ? (
                <p className="py-3 text-center text-[10px] text-foreground/25">
                  —
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayAppts.map((appt) => (
                    <WeekAppointmentChip
                      key={appt.id}
                      appointment={appt}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
