"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RescheduleAppointmentForm } from "@/components/booking/reschedule-appointment-form";

export function RescheduleAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Reagendar
      </button>
    );
  }

  return (
    <div className="w-full min-w-[200px] rounded-xl border border-foreground/10 bg-muted/50 p-3 text-left">
      <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
        Reagendar cita
      </p>
      <div className="mt-3">
        <RescheduleAppointmentForm
          appointmentId={appointmentId}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
