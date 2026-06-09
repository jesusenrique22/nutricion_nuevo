"use client";

import { motion } from "framer-motion";
import { isToday } from "date-fns";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { appointmentsOnDay } from "@/components/calendar/calendar-utils";
import { AppointmentEventCard } from "@/components/calendar/appointment-event-card";

export function CalendarDayView({
  date,
  appointments,
  onSelect,
}: {
  date: Date;
  appointments: AppointmentDTO[];
  onSelect?: (a: AppointmentDTO) => void;
}) {
  const dayAppointments = appointmentsOnDay(appointments, date);
  const today = isToday(date);

  if (dayAppointments.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/12 bg-surface/60 px-6 py-16 text-center">
        <p className="text-4xl">{today ? "☀️" : "📅"}</p>
        <p className="mt-4 text-lg font-semibold text-foreground">
          {today ? "Sin citas para hoy" : "Día libre"}
        </p>
        <p className="mt-2 max-w-xs text-sm text-foreground/50">
          {today
            ? "Cuando un paciente agende, aparecerá aquí en orden cronológico."
            : "No hay consultas programadas para esta fecha."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <div
        aria-hidden
        className="absolute bottom-4 left-[1.65rem] top-4 w-px bg-gradient-to-b from-primary/30 via-accent/40 to-transparent"
      />
      {dayAppointments.map((appt, i) => (
        <motion.div
          key={appt.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative pl-10"
        >
          <span
            aria-hidden
            className="absolute left-4 top-6 z-10 h-3 w-3 rounded-full border-2 border-surface bg-primary shadow-sm"
          />
          <AppointmentEventCard appointment={appt} onSelect={onSelect} />
        </motion.div>
      ))}
    </div>
  );
}
