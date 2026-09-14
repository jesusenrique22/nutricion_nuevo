/**
 * Aviso al paciente cuando la nutricionista publica material en Drive (ficha).
 */
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { createNotification } from "@/server/services/notification.service";

export async function notifyPatientDriveMaterialAdded(params: {
  patientId: string;
  patientEmail: string;
  patientName: string;
  driveUrl: string;
  note?: string | null;
}) {
  try {
    const url = params.driveUrl.trim();
    if (!url) return;

    const panelUrl = "/dashboard/patient";
    await createNotification({
      recipientId: params.patientId,
      type: "RESOURCE_UNLOCKED",
      title: "Material nuevo en tu Drive",
      body: params.note?.trim()
        ? `Anttova subió material: ${params.note.trim()}`
        : "Anttova subió material a tu carpeta de Drive. Ya podés abrirlo desde tu panel.",
      payload: {
        deepLink: panelUrl,
        driveUrl: url,
      },
    });

    if (!isEmailDeliveryConfigured()) return;

    const href = absoluteUrl(panelUrl);
    const safeUrl = url.replace(/"/g, "%22");
    await sendEmail({
      to: params.patientEmail,
      subject: "Anttova — Material nuevo en tu Drive",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
          <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
          <h1 style="font-size:20px;font-weight:600;color:#5a1728">Material disponible</h1>
          <p>Hola ${params.patientName},</p>
          <p>La Lic. Ma Antonieta Lanza subió material para vos en Google Drive.</p>
          ${
            params.note?.trim()
              ? `<p style="margin:16px 0;padding:12px;background:#f9f5f6;border-radius:8px">${params.note.trim()}</p>`
              : ""
          }
          <p style="margin:24px 0">
            <a href="${safeUrl}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
              Abrir material en Drive
            </a>
          </p>
          <p style="font-size:13px;color:#666">También lo encontrás en tu panel: <a href="${href}">${href}</a></p>
        </div>
      `,
      text: `Anttova subió material en Drive.\n${params.note?.trim() ? `${params.note.trim()}\n` : ""}Enlace: ${url}\nPanel: ${href}`,
    });
  } catch (err) {
    console.error("[patient-drive-notify]", err);
  }
}
