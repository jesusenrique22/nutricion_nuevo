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

const STATUS_WEEK: Record<string, string> = {
  PENDING: "Pend.",
  CONFIRMED: "Conf.",
  COMPLETED: "Ok",
  CANCELLED: "Canc.",
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
  const status =
    STATUS_WEEK[appointment.status] ??
    statusLabel(appointment.status).slice(0, 5);
  const detail =
    appointment.patientName ?? appointment.title;

  return (
    <button
      type="button"
      title={`${time} · ${statusLabel(appointment.status)}${detail ? ` · ${detail}` : ""}`}
      onClick={() => onSelect?.(appointment)}
      className={`flex w-full min-w-0 flex-col items-center gap-0.5 overflow-hidden rounded-md border border-foreground/10 border-l-[3px] px-1 py-1.5 text-center transition hover:shadow-sm ${ui.card}`}
    >
      <span className="text-[10px] font-bold tabular-nums leading-none text-primary">
        {time}
      </span>
      <span className="flex max-w-full items-center justify-center gap-0.5">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${ui.dot}`}
        />
        <span className="truncate text-[9px] font-semibold leading-none text-foreground/70">
          {status}
        </span>
      </span>
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
    <div className="anttova-week flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-foreground/8 bg-surface">
      <div className="anttova-week__scroll min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="anttova-week__columns grid h-full min-h-0 w-full grid-cols-7">
          {days.map((day) => {
            const today = isToday(day);
            const isSelected = isSameDay(day, selected);
            const count = appointmentsOnDay(appointments, day).length;
            const dayAppts = appointmentsOnDay(appointments, day);

            return (
              <div
                key={day.toISOString()}
                className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-foreground/6 last:border-r-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectDay?.(day)}
                  aria-pressed={isSelected}
                  className={`flex w-full shrink-0 flex-col items-center gap-0.5 border-b border-foreground/6 px-0.5 py-2 transition ${
                    isSelected
                      ? "bg-primary/10"
                      : "bg-muted/25 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-foreground/45">
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : today
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <span
                    className={`min-h-[12px] text-[9px] font-semibold leading-none ${
                      count > 0 ? "text-primary/70" : "text-transparent"
                    }`}
                    aria-hidden={count === 0}
                  >
                    {count > 0 ? count : "0"}
                  </span>
                </button>

                <div
                  className={`min-h-0 flex-1 overflow-y-auto p-1 ${
                    isSelected ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  {dayAppts.length === 0 ? (
                    <p className="flex h-full min-h-[6rem] items-center justify-center text-center text-[10px] text-foreground/25">
                      —
                    </p>
                  ) : (
                    <div className="space-y-1">
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
