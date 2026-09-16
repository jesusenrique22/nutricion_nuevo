/**
 * Aviso del evento de agenda al participante.
 *
 * El invitado puede no tener cuenta en Anttova, así que el correo se basta a sí
 * mismo: todos los datos del encuentro y botones para agregarlo a su calendario
 * sin pasar por la plataforma.
 */
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { formatClinicDateTimeLong, formatClinicTime } from "@/lib/clinic-timezone";
import {
  googleCalendarTemplateUrl,
  internalEventKindLabel,
  outlookCalendarTemplateUrl,
} from "@/lib/internal-event";
import { createNotification } from "@/server/services/notification.service";

const ORGANIZER_NAME = "Lic. Ma Antonieta Lanza";

export type InternalEventNotifyTarget = {
  /** Presente solo si el participante tiene cuenta en la plataforma. */
  patientId: string | null;
  name: string;
  email: string;
};

export type InternalEventNotifyInput = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  startTime: Date;
  endTime: Date;
  modality: string;
  location: string | null;
  chargeAmount: string | null;
  chargeCurrency: string;
  target: InternalEventNotifyTarget;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function modalityLine(event: InternalEventNotifyInput): string {
  if (event.location?.trim()) {
    return `${event.modality === "ONLINE" ? "Online" : "Presencial"} · ${event.location.trim()}`;
  }
  return event.modality === "ONLINE" ? "Online" : "Presencial";
}

function calendarDescription(event: InternalEventNotifyInput): string {
  const parts = [internalEventKindLabel(event.kind)];
  if (event.description?.trim()) parts.push(event.description.trim());
  parts.push(`Organiza: ${ORGANIZER_NAME} — Anttova Nutrición.`);
  return parts.join("\n\n");
}

/** Aviso de evento creado o reprogramado. */
export async function notifyInternalEventScheduled(
  event: InternalEventNotifyInput,
  options: { rescheduled?: boolean } = {},
): Promise<void> {
  try {
    const rescheduled = options.rescheduled ?? false;
    const when = formatClinicDateTimeLong(event.startTime);
    const until = formatClinicTime(event.endTime);
    const kindLabel = internalEventKindLabel(event.kind);

    if (event.target.patientId) {
      await createNotification({
        recipientId: event.target.patientId,
        type: "APPOINTMENT_CONFIRMED",
        title: rescheduled
          ? "Cambiamos la fecha de tu encuentro"
          : "Tenés un encuentro agendado",
        body: `${event.title} · ${when}`,
        payload: {
          deepLink: "/dashboard/patient/appointments",
          internalEventId: event.id,
        },
      });
    }

    if (!isEmailDeliveryConfigured() || !event.target.email) return;

    const calendarEvent = {
      title: `${event.title} · Anttova`,
      description: calendarDescription(event),
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
    };
    const googleUrl = googleCalendarTemplateUrl(calendarEvent);
    const outlookUrl = outlookCalendarTemplateUrl(calendarEvent);
    const icsUrl = absoluteUrl(`/api/events/${event.id}/ics`);

    const greeting = event.target.name?.trim()
      ? `Hola ${escapeHtml(event.target.name.trim())},`
      : "Hola,";

    const intro = rescheduled
      ? `${ORGANIZER_NAME} reprogramó el encuentro que tenían coordinado. Esta es la nueva fecha:`
      : `${ORGANIZER_NAME} te reservó un espacio en su agenda. Estos son los datos:`;

    const chargeRow =
      event.chargeAmount && Number(event.chargeAmount) > 0
        ? `<tr><td style="padding:6px 0;color:#7a6a6e;font-size:13px">Arancel</td><td style="padding:6px 0;font-size:14px;font-weight:600">${escapeHtml(event.chargeCurrency)} ${escapeHtml(event.chargeAmount)}</td></tr>`
        : `<tr><td style="padding:6px 0;color:#7a6a6e;font-size:13px">Arancel</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#4a7c59">Sin cargo</td></tr>`;

    const descriptionBlock = event.description?.trim()
      ? `<p style="margin:18px 0 0;padding:14px 16px;background:#f9f5f6;border-radius:10px;font-size:14px;line-height:1.6;color:#4a3d40">${escapeHtml(event.description.trim()).replace(/\n/g, "<br />")}</p>`
      : "";

    await sendEmail({
      to: event.target.email,
      subject: rescheduled
        ? `Anttova — Nueva fecha para «${event.title}»`
        : `Anttova — Te agendamos: «${event.title}»`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:8px;color:#1a1a1a">
          <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a2969a;margin:0 0 4px">Anttova Nutrición</p>
          <h1 style="font-size:22px;font-weight:600;color:#5a1728;margin:0 0 18px;line-height:1.3">
            ${rescheduled ? "Cambiamos la fecha de tu encuentro" : "Tenés un espacio reservado"}
          </h1>

          <p style="font-size:15px;line-height:1.6;margin:0 0 6px">${greeting}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#4a3d40">${intro}</p>

          <div style="border:1px solid #efe4e7;border-radius:14px;padding:18px 20px;background:#fff">
            <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#5a1728">${escapeHtml(event.title)}</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#7a6a6e;font-size:13px;width:38%">Motivo</td><td style="padding:6px 0;font-size:14px;font-weight:600">${escapeHtml(kindLabel)}</td></tr>
              <tr><td style="padding:6px 0;color:#7a6a6e;font-size:13px">Cuándo</td><td style="padding:6px 0;font-size:14px;font-weight:600">${escapeHtml(when)} — ${escapeHtml(until)}</td></tr>
              <tr><td style="padding:6px 0;color:#7a6a6e;font-size:13px">Dónde</td><td style="padding:6px 0;font-size:14px;font-weight:600">${escapeHtml(modalityLine(event))}</td></tr>
              ${chargeRow}
            </table>
            ${descriptionBlock}
          </div>

          <p style="margin:26px 0 10px;font-size:14px;font-weight:600;color:#4a3d40">¿Lo guardás en tu calendario?</p>
          <p style="margin:0 0 6px">
            <a href="${googleUrl}" style="background:#5a1728;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;font-size:14px">
              Agregar a Google Calendar
            </a>
          </p>
          <p style="margin:10px 0 0;font-size:13px;color:#7a6a6e">
            También podés usar
            <a href="${outlookUrl}" style="color:#5a1728;font-weight:600">Outlook</a>
            o descargar el
            <a href="${icsUrl}" style="color:#5a1728;font-weight:600">archivo para tu calendario (.ics)</a>,
            que sirve para Apple Calendar y el resto.
          </p>

          <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#7a6a6e">
            Si esta fecha no te queda cómoda, respondé este correo y lo reacomodamos.
            ¡Gracias!
          </p>
          <p style="margin:18px 0 0;font-size:13px;color:#a2969a">
            ${ORGANIZER_NAME} · Anttova Nutrición
          </p>
        </div>
      `,
      text: [
        rescheduled
          ? "Cambiamos la fecha de tu encuentro en Anttova."
          : "Tenés un espacio reservado en la agenda de Anttova.",
        "",
        event.title,
        `Motivo: ${kindLabel}`,
        `Cuándo: ${when} — ${until}`,
        `Dónde: ${modalityLine(event)}`,
        event.chargeAmount && Number(event.chargeAmount) > 0
          ? `Arancel: ${event.chargeCurrency} ${event.chargeAmount}`
          : "Arancel: sin cargo",
        event.description?.trim() ? `\n${event.description.trim()}` : "",
        "",
        `Agregar a Google Calendar: ${googleUrl}`,
        `Archivo .ics: ${icsUrl}`,
        "",
        `${ORGANIZER_NAME} · Anttova Nutrición`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (err) {
    console.error("[internal-event-notify/scheduled]", err);
  }
}

/** Aviso de evento cancelado. */
export async function notifyInternalEventCancelled(
  event: InternalEventNotifyInput,
): Promise<void> {
  try {
    const when = formatClinicDateTimeLong(event.startTime);

    if (event.target.patientId) {
      await createNotification({
        recipientId: event.target.patientId,
        type: "APPOINTMENT_CANCELLED",
        title: "Se canceló un encuentro",
        body: `${event.title} · ${when}`,
        payload: { deepLink: "/dashboard/patient/appointments" },
      });
    }

    if (!isEmailDeliveryConfigured() || !event.target.email) return;

    const greeting = event.target.name?.trim()
      ? `Hola ${escapeHtml(event.target.name.trim())},`
      : "Hola,";

    await sendEmail({
      to: event.target.email,
      subject: `Anttova — Se canceló «${event.title}»`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:8px;color:#1a1a1a">
          <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a2969a;margin:0 0 4px">Anttova Nutrición</p>
          <h1 style="font-size:22px;font-weight:600;color:#5a1728;margin:0 0 18px;line-height:1.3">Encuentro cancelado</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 6px">${greeting}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#4a3d40">
            Tenemos que cancelar el encuentro que teníamos agendado. Perdón por el cambio.
          </p>
          <div style="border:1px solid #efe4e7;border-radius:14px;padding:16px 20px;background:#fff">
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#5a1728">${escapeHtml(event.title)}</p>
            <p style="margin:0;font-size:14px;color:#7a6a6e">${escapeHtml(when)}</p>
          </div>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#4a3d40">
            Si querés, respondé este correo y buscamos otra fecha que te sirva.
          </p>
          <p style="margin:18px 0 0;font-size:13px;color:#a2969a">${ORGANIZER_NAME} · Anttova Nutrición</p>
        </div>
      `,
      text: `Se canceló el encuentro «${event.title}» del ${when}.\nRespondé este correo si querés reprogramarlo.\n\n${ORGANIZER_NAME} · Anttova Nutrición`,
    });
  } catch (err) {
    console.error("[internal-event-notify/cancelled]", err);
  }
}

export { ORGANIZER_NAME };
