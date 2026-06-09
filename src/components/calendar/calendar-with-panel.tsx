"use client";

import { useEffect, useState } from "react";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { AppointmentAdminPanel } from "@/components/calendar/appointment-admin-panel";
import { DoctorCalendar } from "@/components/calendar/doctor-calendar";
import "./anttova-calendar.css";

export function CalendarWithPanel({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <>
      <DoctorCalendar
        appointments={appointments}
        onSelectAppointment={setSelected}
      />
      {selected && (
        <AppointmentAdminPanel
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
