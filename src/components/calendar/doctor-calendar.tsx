"use client";

import { useMemo } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  type Event,
} from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { es } from "date-fns/locale/es";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

const statusColor: Record<string, string> = {
  PENDING: "#e8a33d",
  CONFIRMED: "#4f7942",
  COMPLETED: "#9ca3af",
  CANCELLED: "#dc2626",
  NO_SHOW: "#dc2626",
};

export function DoctorCalendar({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  const events: (Event & { status: string })[] = useMemo(
    () =>
      appointments.map((a) => ({
        title: a.title,
        start: new Date(a.start),
        end: new Date(a.end),
        status: a.status,
      })),
    [appointments],
  );

  return (
    <div className="rounded-2xl border border-foreground/10 bg-white p-4">
      <div style={{ height: 640 }}>
        <Calendar
          localizer={localizer}
          culture="es"
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.WEEK}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          min={new Date(1970, 0, 1, 7, 0)}
          max={new Date(1970, 0, 1, 20, 0)}
          messages={{
            month: "Mes",
            week: "Semana",
            day: "Día",
            today: "Hoy",
            previous: "Anterior",
            next: "Siguiente",
            noEventsInRange: "Sin citas en este rango.",
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor:
                statusColor[(event as { status: string }).status] ?? "#4f7942",
              borderRadius: "6px",
              border: "none",
              color: "white",
              fontSize: "0.8rem",
            },
          })}
        />
      </div>
    </div>
  );
}
