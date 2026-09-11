"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { AppointmentAdminPanel } from "@/components/calendar/appointment-admin-panel";
import { DoctorCalendar } from "@/components/calendar/doctor-calendar";
import "./anttova-calendar.css";

export function CalendarWithPanel({
  appointments,
  initialAppointmentId,
}: {
  appointments: AppointmentDTO[];
  initialAppointmentId?: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);
  const [focusDate, setFocusDate] = useState<Date | null>(null);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DoctorCalendar
        appointments={appointments}
        focusDate={focusDate}
        onSelectAppointment={setSelected}
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
