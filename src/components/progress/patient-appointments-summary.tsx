import Link from "next/link";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { ArrowRightIcon } from "@/components/ui/link-icons";
import {
  appointmentStatusLabels,
  modalityLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-primary/15 text-primary",
  COMPLETED: "bg-foreground/10 text-foreground/60",
  NO_SHOW: "bg-red-100 text-red-600",
};

export function PatientAppointmentsSummary({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  const recent = appointments.slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-foreground/15 bg-white/60 px-6 py-10 text-center">
        <p className="text-sm text-foreground/60">
          Todavía no agendaste citas.
        </p>
        <Link
          href="/dashboard/patient/appointments"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Agendar cita
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recent.map((a) => {
        const payStatus =
          a.paymentPhases?.overallStatus ?? a.paymentStatus ?? "PENDING";

        return (
          <article
            key={a.id}
            className="rounded-2xl border border-foreground/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {modalityLabels[a.modality] ?? a.modality}
                </p>
                <h3 className="mt-1 font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-foreground/60">{fmt(a.start)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    statusStyles[a.status] ?? "bg-muted text-foreground"
                  }`}
                >
                  {appointmentStatusLabels[a.status] ?? a.status}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-foreground/70">
                  {paymentStatusLabels[payStatus] ?? payStatus}
                </span>
              </div>
            </div>
          </article>
        );
      })}
      <Link
        href="/dashboard/patient/appointments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Ver todas las citas
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
