"use client";

import { useState } from "react";
import { CalendarWithPanel } from "@/components/calendar/calendar-with-panel";
import { InternalEventsPanel } from "@/components/calendar/internal-events-panel";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import type { InternalEventDTO } from "@/server/actions/internal-event.actions";
import type { PatientListItem } from "@/server/actions/patient.queries";

/**
 * Une la agenda propia con el calendario de citas: tocar un evento en el
 * calendario abre su ficha en el panel de arriba, sin salir de la página.
 */
export function AdminCalendarWorkspace({
  appointments,
  internalEvents,
  patients,
  initialAppointmentId,
}: {
  appointments: AppointmentDTO[];
  internalEvents: InternalEventDTO[];
  patients: PatientListItem[];
  initialAppointmentId?: string | null;
}) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  return (
    <>
      <InternalEventsPanel
        events={internalEvents}
        patients={patients}
        openEventId={openEventId}
        onOpenEventHandled={() => setOpenEventId(null)}
      />

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <CalendarWithPanel
          appointments={appointments}
          internalEvents={internalEvents}
          initialAppointmentId={initialAppointmentId}
          onEditInternalEvent={(eventId) => {
            setOpenEventId(eventId);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        />
      </div>
    </>
  );
}
