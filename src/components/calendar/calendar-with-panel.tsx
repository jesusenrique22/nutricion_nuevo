"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  internalEventIdFromCalendarId,
  internalEventToCalendarEntry,
  isInternalEventCalendarId,
} from "@/lib/internal-event-calendar";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import type { InternalEventDTO } from "@/server/actions/internal-event.actions";
import { AppointmentAdminPanel } from "@/components/calendar/appointment-admin-panel";
import { DoctorCalendar } from "@/components/calendar/doctor-calendar";
import "./anttova-calendar.css";

export function CalendarWithPanel({
  appointments,
  internalEvents = [],
  initialAppointmentId,
  onEditInternalEvent,
}: {
  appointments: AppointmentDTO[];
  /** Eventos propios: se dibujan en el calendario pero se editan en su panel. */
  internalEvents?: InternalEventDTO[];
  initialAppointmentId?: string | null;
  onEditInternalEvent?: (eventId: string) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);
  const [focusDate, setFocusDate] = useState<Date | null>(null);

  const entries = useMemo(
    () => [...appointments, ...internalEvents.map(internalEventToCalendarEntry)],
    [appointments, internalEvents],
  );

  useEffect(() => {
    if (!initialAppointmentId) return;
    const appt = appointments.find((a) => a.id === initialAppointmentId);
    if (!appt) return;

    const when = new Date(appt.start);
    if (Number.isNaN(when.getTime())) return;

    setSelected(appt);
    setFocusDate(when);
    router.replace("/dashboard/admin/calendar", { scroll: false });
  }, [initialAppointmentId, appointments, router]);

  function handleSelect(entry: AppointmentDTO) {
    // Un evento propio no se gestiona como cita: no tiene estado ni pago.
    if (isInternalEventCalendarId(entry.id)) {
      onEditInternalEvent?.(internalEventIdFromCalendarId(entry.id));
      return;
    }
    setSelected(entry);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DoctorCalendar
        appointments={entries}
        focusDate={focusDate}
        onSelectAppointment={handleSelect}
      />
      {selected && (
        <AppointmentAdminPanel
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
