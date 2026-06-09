"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/server/actions/appointment-status.actions";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setMessage(null);
    startTransition(async () => {
      const res = await cancelAppointment({ appointmentId });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        Cancelar cita
      </button>
    );
  }

  return (
    <div className="text-right">
      <p className="text-xs text-foreground/50">¿Confirmas la cancelación?</p>
      <div className="mt-1 flex justify-end gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-semibold hover:underline"
        >
          No
        </button>
        <button
          disabled={isPending}
          onClick={handleCancel}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {isPending ? "…" : "Sí, cancelar"}
        </button>
      </div>
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </div>
  );
}
