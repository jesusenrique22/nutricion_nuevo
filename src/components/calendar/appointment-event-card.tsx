"use client";

import { motion } from "framer-motion";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { modalityLabels, cancelledByLabels } from "@/lib/appointment-labels";
import {
  formatDuration,
  formatTime,
} from "@/components/calendar/calendar-utils";
import { statusLabel, statusUi } from "@/components/calendar/calendar-status";

export function AppointmentEventCard({
  appointment,
  onSelect,
  compact = false,
}: {
  appointment: AppointmentDTO;
  onSelect?: (a: AppointmentDTO) => void;
  compact?: boolean;
}) {
  const ui = statusUi(appointment.status);
  const time = formatTime(appointment.start);
  const duration = formatDuration(appointment.start, appointment.end);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(appointment)}
      className={`group w-full rounded-2xl border p-3 text-left transition-shadow hover:shadow-md sm:p-4 ${ui.card}`}
    >
      <div className="flex items-start gap-3">
        {!compact && (
          <div className="shrink-0 pt-0.5 text-center">
            <p className="text-lg font-bold tabular-nums leading-none text-primary">
              {time}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              {duration}
            </p>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {compact && (
              <span className="text-sm font-bold tabular-nums text-primary">
                {time}
              </span>
            )}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ui.badge}`}
            >
              {statusLabel(appointment.status)}
            </span>
          </div>
          <p className="mt-1 truncate font-semibold text-foreground">
            {appointment.patientName ?? appointment.title}
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground/55">
            {appointment.consultationName ?? appointment.title}
          </p>
          {!compact && (
            <p className="mt-2 text-xs text-foreground/45">
              {modalityLabels[appointment.modality] ?? appointment.modality}
              {appointment.paymentStatus === "PENDING" && " · Procesando"}
              {appointment.paymentStatus === "PAID" && " · Pagado"}
              {appointment.paymentStatus === "PARTIAL" && " · Adelanto pagado"}
              {appointment.status === "CANCELLED" &&
                appointment.cancelledBy &&
                ` · ${cancelledByLabels[appointment.cancelledBy] ?? appointment.cancelledBy}`}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 self-center text-foreground/25 transition group-hover:text-primary sm:inline">
          →
        </span>
      </div>
    </motion.button>
  );
}
