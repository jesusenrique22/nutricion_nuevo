import { DoctorCalendar } from "@/components/calendar/doctor-calendar";
import { getAllAppointments } from "@/server/actions/booking.queries";

export default async function CalendarPage() {
  const appointments = await getAllAppointments();

  return (
    <div>
      <h1 className="text-3xl font-bold">Calendario</h1>
      <p className="mt-2 text-foreground/60">
        Tus citas en vista mes / semana / día.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" /> Pendiente
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-primary" /> Confirmada
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-foreground/40" /> Completada
        </span>
      </div>

      <div className="mt-6">
        <DoctorCalendar appointments={appointments} />
      </div>
    </div>
  );
}
