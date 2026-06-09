import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale/es";
import type { AppointmentDTO } from "@/server/actions/booking.queries";

export { isSameDay, isToday, format };

export type CalendarView = "day" | "week" | "month";

export function appointmentsOnDay(
  appointments: AppointmentDTO[],
  day: Date,
): AppointmentDTO[] {
  return appointments
    .filter((a) => isSameDay(new Date(a.start), day))
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
}

export function appointmentsInRange(
  appointments: AppointmentDTO[],
  start: Date,
  end: Date,
): AppointmentDTO[] {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime() + 86_400_000 - 1;
  return appointments.filter((a) => {
    const t = new Date(a.start).getTime();
    return t >= s && t <= e;
  });
}

export function countByDay(
  appointments: AppointmentDTO[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of appointments) {
    const key = format(new Date(a.start), "yyyy-MM-dd");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { locale: es, weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function getMonthWeeks(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function navigateDate(
  date: Date,
  view: CalendarView,
  direction: "prev" | "next",
): Date {
  const delta = direction === "next" ? 1 : -1;
  if (view === "day") return delta > 0 ? addDays(date, 1) : subDays(date, 1);
  if (view === "week") return delta > 0 ? addWeeks(date, 1) : subWeeks(date, 1);
  return delta > 0 ? addMonths(date, 1) : subMonths(date, 1);
}

export function headerLabel(date: Date, view: CalendarView): string {
  if (view === "day") {
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }
  if (view === "week") {
    const days = getWeekDays(date);
    const first = days[0]!;
    const last = days[6]!;
    if (isSameMonth(first, last)) {
      return `${format(first, "d")} – ${format(last, "d MMMM yyyy", { locale: es })}`;
    }
    return `${format(first, "d MMM", { locale: es })} – ${format(last, "d MMM yyyy", { locale: es })}`;
  }
  return format(date, "MMMM yyyy", { locale: es });
}

export function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm", { locale: es });
}

export function formatDuration(start: string, end: string): string {
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
  );
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export { isSameMonth };
