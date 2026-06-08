import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import {
  getConsultationTypes,
  getMyAppointments,
} from "@/server/actions/booking.queries";
import { getPendingFormAppointments } from "@/server/actions/patient.queries";

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-primary/15 text-primary",
  COMPLETED: "bg-foreground/10 text-foreground/60",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-red-100 text-red-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PatientAppointmentsPage() {
  const [types, appointments, pendingForms] = await Promise.all([
    getConsultationTypes(),
    getMyAppointments(),
    getPendingFormAppointments(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Mis citas</h1>
      <p className="mt-2 text-foreground/60">
        Agenda una consulta y revisa tu historial.
      </p>

      {pendingForms.length > 0 && (
        <div className="mt-6 space-y-3">
          {pendingForms.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4"
            >
              <div>
                <div className="font-semibold">
                  {p.flow === "INTAKE"
                    ? "Completa tu formulario de ingreso"
                    : "Completa tu formulario de seguimiento"}
                </div>
                <div className="text-sm text-foreground/60">
                  {p.title} · {fmt(p.start)}
                </div>
              </div>
              <Link
                href={`/dashboard/patient/appointments/${p.id}/form`}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:scale-105"
              >
                Completar ahora
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <BookingForm types={types} />

        <div>
          <h2 className="text-lg font-bold">Historial</h2>
          <div className="mt-4 space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-foreground/50">
                Aún no tienes citas agendadas.
              </p>
            )}
            {appointments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-white p-4"
              >
                <div>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm text-foreground/50">
                    {fmt(a.start)} · {a.modality}
                    {a.flow === "INTAKE" ? " · 1ª cita" : " · Seguimiento"}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    statusStyles[a.status] ?? "bg-muted"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
