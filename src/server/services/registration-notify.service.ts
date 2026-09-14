/**
 * Avisos al equipo cuando un paciente crea su cuenta.
 * NO usar "use server": es un servicio interno.
 */
import {
  getAdminNotificationEmails,
  getAdminUserIds,
} from "@/lib/admin-users";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { createNotification } from "@/server/services/notification.service";

export async function notifyNewPatientRegistered(params: {
  patientId: string;
  name: string;
  email: string;
  phone?: string | null;
}) {
  try {
    const fichaUrl = `/dashboard/admin/patients/${params.patientId}`;
    const adminIds = await getAdminUserIds();

    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "NEW_PATIENT_REGISTERED",
          title: "Nuevo paciente registrado",
          body: `${params.name} creó su cuenta (${params.email}${params.phone ? ` · ${params.phone}` : ""}).`,
          payload: {
            deepLink: fichaUrl,
            patientId: params.patientId,
          },
        }),
      ),
    );

    if (!isEmailDeliveryConfigured()) return;

    const href = absoluteUrl(fichaUrl);
    const rows = [
      `<strong>Nombre:</strong> ${params.name}`,
      `<strong>Email:</strong> ${params.email}`,
    ];
    if (params.phone) rows.push(`<strong>Teléfono:</strong> ${params.phone}`);

    const recipients = await getAdminNotificationEmails();
    await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject: `Anttova — Nuevo paciente registrado: ${params.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#5a1728">Nuevo paciente registrado</h1>
              <p>Se creó una cuenta nueva en la plataforma:</p>
              <div style="background:#f9f5f6;border-left:4px solid #5a1728;padding:16px;margin:20px 0;border-radius:4px">
                ${rows.map((row) => `<p style="margin:4px 0">${row}</p>`).join("")}
              </div>
              <p style="margin:24px 0">
                <a href="${href}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                  Ver ficha del paciente
                </a>
              </p>
            </div>
          `,
          text: `Nuevo paciente registrado\nNombre: ${params.name}\nEmail: ${params.email}${params.phone ? `\nTeléfono: ${params.phone}` : ""}\nFicha: ${href}`,
        }),
      ),
    );
  } catch (err) {
    // Nunca romper el alta del paciente por un fallo de notificación.
    console.error("[registration-notify]", err);
  }
}
