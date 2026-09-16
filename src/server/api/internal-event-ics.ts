import { CLINIC_NOTIFICATION_EMAIL } from "@/lib/admin-users";
import { buildIcsFile, internalEventKindLabel } from "@/lib/internal-event";
import { isPrismaInternalEventReady, prisma } from "@/server/db/prisma";

const ORGANIZER_NAME = "Lic. Ma Antonieta Lanza";

/**
 * Archivo .ics de un evento de agenda, para que el invitado lo abra en Apple
 * Calendar, Outlook o el que use.
 *
 * Es público a propósito: el enlace viaja en el correo de invitación y quien lo
 * recibe puede no tener cuenta en Anttova. El id del evento hace de credencial
 * y solo se expone lo que esa misma persona ya recibió por correo.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    if (!id || !isPrismaInternalEventReady()) {
      return new Response("No encontrado", { status: 404 });
    }

    const event = await prisma.internalEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        kind: true,
        startTime: true,
        endTime: true,
        location: true,
        modality: true,
        cancelledAt: true,
        guestEmail: true,
        patient: { select: { email: true } },
      },
    });

    if (!event) {
      return new Response("No encontrado", { status: 404 });
    }

    const description = [
      internalEventKindLabel(event.kind),
      event.description?.trim() || null,
      `Organiza: ${ORGANIZER_NAME} — Anttova Nutrición.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const ics = buildIcsFile({
      id: event.id,
      title: `${event.title} · Anttova`,
      description,
      location:
        event.location?.trim() ||
        (event.modality === "ONLINE" ? "Online" : null),
      startTime: event.startTime,
      endTime: event.endTime,
      organizerName: ORGANIZER_NAME,
      organizerEmail: CLINIC_NOTIFICATION_EMAIL,
      attendeeEmail: event.patient?.email ?? event.guestEmail,
      cancelled: Boolean(event.cancelledAt),
    });

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="anttova-${event.id}.ics"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[internal-event/ics]", err);
    return new Response("Error al generar el archivo", { status: 500 });
  }
}
