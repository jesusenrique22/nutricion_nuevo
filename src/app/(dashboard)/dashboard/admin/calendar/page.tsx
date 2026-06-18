import { CalendarWithPanel } from "@/components/calendar/calendar-with-panel";
import { getAllAppointments } from "@/server/actions/booking.queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const appointments = await getAllAppointments();

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
            anttova · admin
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Calendario de citas
          </h1>
        </div>
        <p className="max-w-md text-xs text-foreground/55 sm:text-right">
          Mini calendario + agenda sincronizados. Toca una cita para gestionarla.
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <CalendarWithPanel appointments={appointments} />
      </div>
    </div>
  );
}
