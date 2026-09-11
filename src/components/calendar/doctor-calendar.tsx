"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isToday, startOfMonth } from "date-fns";
import { es } from "date-fns/locale/es";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CalendarMiniMonth } from "@/components/calendar/calendar-mini-month";
import { CalendarDayView } from "@/components/calendar/calendar-day-view";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { STATUS_UI, statusLabel } from "@/components/calendar/calendar-status";
import {
  appointmentsOnDay,
  headerLabel,
  navigateDate,
  type CalendarView,
} from "@/components/calendar/calendar-utils";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

export function DoctorCalendar({
  appointments,
  focusDate,
  onSelectAppointment,
}: {
  appointments: AppointmentDTO[];
  /** Salta al día de una cita (p. ej. desde una notificación). */
  focusDate?: Date | null;
  onSelectAppointment?: (appointment: AppointmentDTO) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [miniMonth, setMiniMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  useEffect(() => {
    if (!focusDate || Number.isNaN(focusDate.getTime())) return;
    setSelectedDate(focusDate);
    setMiniMonth(startOfMonth(focusDate));
    if (isMobile) setView("day");
  }, [focusDate, isMobile]);

  useEffect(() => {
    if (isMobile) setView("day");
  }, [isMobile]);

  useEffect(() => {
    setMiniMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const todayCount = useMemo(
    () => appointmentsOnDay(appointments, new Date()).length,
    [appointments],
  );

  const selectedCount = useMemo(
    () => appointmentsOnDay(appointments, selectedDate).length,
    [appointments, selectedDate],
  );

  function goToday() {
    const now = new Date();
    setSelectedDate(now);
    setMiniMonth(startOfMonth(now));
  }

  function pickDay(day: Date) {
    setSelectedDate(day);
    setMiniMonth(startOfMonth(day));
    if (view === "month") setView("day");
  }

  function navigate(direction: "prev" | "next") {
    setSelectedDate((d) => navigateDate(d, view, direction));
  }

  const realToday = new Date();
  const selectedDateValid = !Number.isNaN(selectedDate.getTime());
  const isSelectedToday =
    selectedDateValid && isSameDay(selectedDate, realToday);
  const focusDayLabel = !selectedDateValid
    ? "—"
    : isSelectedToday
      ? "Hoy"
      : format(selectedDate, "d MMM", { locale: es });

  return (
    <div className="anttova-calendar flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
      <div className="grid w-full min-w-0 flex-1 items-start gap-3 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)] lg:gap-5">
        <aside className="flex w-full min-w-0 flex-col gap-2.5 self-start lg:gap-3">
          <CalendarMiniMonth
            month={miniMonth}
            selected={selectedDate}
            appointments={appointments}
            onSelectDay={pickDay}
            onChangeMonth={setMiniMonth}
            compact={isMobile}
          />

          <StatPill
            label="Hoy"
            day={format(realToday, "d")}
            detail={format(realToday, "EEE", { locale: es })}
            count={todayCount}
            active={isSelectedToday}
          />
          <StatPill
            label="Seleccionado"
            day={format(selectedDate, "d")}
            detail={format(selectedDate, "EEE", { locale: es })}
            count={selectedCount}
            active={!isSelectedToday}
          />
        </aside>

        <div className="anttova-calendar__main flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden">
          <header className="anttova-calendar__header min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                Agenda
              </p>
              <h2 className="truncate text-base font-bold capitalize sm:text-lg">
                {headerLabel(selectedDate, view)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex rounded-full border border-foreground/10 bg-surface p-0.5">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition sm:px-4 ${
                      view === v.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/55 hover:text-primary"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <NavBtn label="Anterior" onClick={() => navigate("prev")}>
                  ←
                </NavBtn>
                <button
                  type="button"
                  onClick={goToday}
                  title={
                    isSelectedToday
                      ? "Día actual"
                      : "Volver al día de hoy"
                  }
                  className={`min-w-[3.25rem] rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    isSelectedToday
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-accent-soft text-primary hover:bg-accent"
                  }`}
                >
                  {focusDayLabel}
                </button>
                <NavBtn label="Siguiente" onClick={() => navigate("next")}>
                  →
                </NavBtn>
              </div>
            </div>
          </header>

          <div
            className={`anttova-calendar__body min-w-0 overflow-hidden ${
              view === "day"
                ? "anttova-calendar__body--day"
                : view === "week"
                  ? "anttova-calendar__body--week"
                  : ""
            }`}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {view === "day" && (
                <CalendarDayView
                  date={selectedDate}
                  appointments={appointments}
                  onSelect={onSelectAppointment}
                />
              )}
              {view === "week" && (
                <CalendarWeekView
                  date={selectedDate}
                  selected={selectedDate}
                  appointments={appointments}
                  onSelectDay={pickDay}
                  onSelect={onSelectAppointment}
                />
              )}
              {view === "month" && (
                <CalendarMonthView
                  month={selectedDate}
                  selected={selectedDate}
                  appointments={appointments}
                  onSelectDay={pickDay}
                />
              )}
            </div>

            <div className="mt-3 flex shrink-0 flex-wrap gap-x-3 gap-y-1.5 border-t border-foreground/6 pt-3">
              {Object.entries(STATUS_UI).map(([key, ui]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ui.dot}`} />
                  {statusLabel(key)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-surface text-sm font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary"
    >
      {children}
    </button>
  );
}

function StatPill({
  label,
  day,
  detail,
  count,
  active,
}: {
  label: string;
  day: string;
  detail: string;
  count: number;
  active?: boolean;
}) {
  return (
    <div
      className={`h-fit w-full rounded-xl border px-3.5 py-3 lg:rounded-2xl lg:px-4 lg:py-3.5 ${
        active
          ? "border-primary/20 bg-primary/8 ring-1 ring-primary/15"
          : "border-foreground/8 bg-surface shadow-sm"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 lg:text-[11px]">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums leading-none text-primary lg:text-[1.75rem]">
          {day}
        </p>
      </div>
      <p className="mt-1.5 truncate text-[11px] capitalize text-foreground/50 lg:text-xs">
        {detail} · {count} cita{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
