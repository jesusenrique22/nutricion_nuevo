import {
  googleCalendarTemplateUrl,
  internalEventKindLabel,
} from "@/lib/internal-event";
import { modalityLabels } from "@/lib/appointment-labels";
import { formatClinicDateTimeLong, formatClinicTime } from "@/lib/clinic-timezone";
import type { InternalEventDTO } from "@/server/actions/internal-event.actions";

/**
 * Encuentros que Anttova agenda directamente (seguimiento de un pack, consulta
 * extra). No son reservas del paciente: no se pagan ni se cancelan desde acá.
 */
export function PatientInternalEvents({
  events,
}: {
  events: InternalEventDTO[];
}) {
  if (events.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-foreground/10 bg-white p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        Agendado por Anttova
      </p>
      <h2 className="mt-1 text-lg font-bold">Tus próximos encuentros</h2>
      <p className="mt-1 text-sm text-foreground/55">
        Espacios que la Lic. Ma Antonieta Lanza reservó para vos. Si alguno no
        te queda cómodo, escribile y lo reacomodan.
      </p>

      <ul className="mt-4 space-y-3">
        {events.map((event) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          const calendarUrl = googleCalendarTemplateUrl({
            title: `${event.title} · Anttova`,
            description: event.description,
            location: event.location,
            startTime: start,
            endTime: end,
          });

          return (
            <li
              key={event.id}
              className="rounded-2xl border border-foreground/8 bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{event.title}</span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {formatClinicDateTimeLong(start)} — {formatClinicTime(end)}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground/55">
                {internalEventKindLabel(event.kind)} ·{" "}
                {modalityLabels[event.modality] ?? event.modality}
                {event.location?.trim() ? ` · ${event.location.trim()}` : ""}
                {event.chargeAmount && Number(event.chargeAmount) > 0
                  ? ` · ${event.chargeCurrency} ${event.chargeAmount}`
                  : " · sin cargo"}
              </p>
              {event.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/70">
                  {event.description}
                </p>
              )}
              <p className="mt-3 flex flex-wrap gap-4">
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary underline"
                >
                  Agregar a Google Calendar
                </a>
                <a
                  href={`/api/events/${event.id}/ics`}
                  className="text-xs font-semibold text-foreground/55 underline"
                >
                  Descargar .ics
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
