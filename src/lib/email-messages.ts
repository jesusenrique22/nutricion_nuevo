import { formatClinicDateTimeLong } from "@/lib/clinic-timezone";

const brand = "Anttova";

export function passwordResetEmail(resetUrl: string) {
  const subject = `${brand} — Restablecer contraseña`;
  const text = `Recibimos una solicitud para restablecer tu contraseña.\n\nAbre este enlace (válido 1 hora):\n${resetUrl}\n\nSi no lo pediste, ignora este mensaje.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova</p>
      <h1 style="font-size:22px;font-weight:600">Restablecer contraseña</h1>
      <p>Hacé clic en el botón para elegir una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}" style="background:#5a1728;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size:13px;color:#666">Si el botón no funciona, copiá este enlace:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:12px;color:#999;margin-top:32px">Si no solicitaste esto, podés ignorar el correo.</p>
    </div>
  `;
  return { subject, text, html };
}

export function passwordResetCodeEmail(code: string) {
  const subject = `${brand} — Tu código para restablecer contraseña`;
  const text = `Recibimos una solicitud para restablecer tu contraseña.\n\nTu código es:\n\n${code}\n\nIngresalo en la página de recuperación. Válido por 15 minutos.\n\nSi no lo pediste, podés ignorar este mensaje.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">${brand}</p>
      <h1 style="font-size:22px;font-weight:600">Restablecer contraseña</h1>
      <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta. Ingresá el siguiente código en la página de recuperación:</p>
      <div style="margin:28px 0;text-align:center">
        <div style="display:inline-block;background:#f5f0f1;border:2px solid #5a1728;border-radius:16px;padding:20px 36px">
          <span style="font-size:40px;font-weight:800;letter-spacing:0.25em;color:#5a1728;font-family:monospace">${code}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#666">Este código es válido por <strong>15 minutos</strong>. No lo compartas con nadie.</p>
      <p style="font-size:12px;color:#999;margin-top:32px">Si no solicitaste esto, podés ignorar el correo. Tu contraseña no cambiará.</p>
    </div>
  `;
  return { subject, text, html };
}

export function verifyEmailMessage(verifyUrl: string, name: string) {
  const subject = `${brand} — Confirmá tu cuenta`;
  const text = `Hola ${name},\n\nGracias por registrarte en Anttova. Confirmá tu email:\n${verifyUrl}\n\nEl enlace expira en 24 horas.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova</p>
      <h1 style="font-size:22px;font-weight:600">Confirmá tu cuenta</h1>
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Gracias por registrarte. Confirmá tu email para acceder a citas, formularios y tu panel personal.</p>
      <p style="margin:28px 0">
        <a href="${verifyUrl}" style="background:#5a1728;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
          Verificar email
        </a>
      </p>
      <p style="font-size:13px;color:#666">Si el botón no funciona, copiá este enlace:<br/><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="font-size:12px;color:#999;margin-top:32px">El enlace expira en 24 horas.</p>
    </div>
  `;
  return { subject, text, html };
}

const fmtAppointmentDate = formatClinicDateTimeLong;

export function appointmentReminderEmail(params: {
  name: string;
  consultationName: string;
  startTime: Date;
  appointmentsUrl: string;
}) {
  const when = fmtAppointmentDate(params.startTime);
  const subject = `${brand} — Recordatorio de cita`;
  const text = `Hola ${params.name},\n\nTe recordamos que mañana tienes ${params.consultationName}:\n${when}\n\nVer tus citas: ${params.appointmentsUrl}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">${brand}</p>
      <h1 style="font-size:22px;font-weight:600">Recordatorio de cita</h1>
      <p>Hola <strong>${escapeHtml(params.name)}</strong>,</p>
      <p>Te recordamos que mañana tienes <strong>${escapeHtml(params.consultationName)}</strong>:</p>
      <p style="font-size:16px;font-weight:600;color:#5a1728">${escapeHtml(when)}</p>
      <p style="margin:28px 0">
        <a href="${params.appointmentsUrl}" style="background:#5a1728;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
          Ver mis citas
        </a>
      </p>
      <p style="font-size:12px;color:#999;margin-top:32px">Si necesitás cambiar el horario, podés reagendar desde tu panel.</p>
    </div>
  `;
  return { subject, text, html };
}

export function appointmentRescheduledEmail(params: {
  name: string;
  consultationName: string;
  newStartTime: Date;
  appointmentsUrl: string;
}) {
  const when = fmtAppointmentDate(params.newStartTime);
  const subject = `${brand} — Cita reagendada`;
  const text = `Hola ${params.name},\n\nTu cita de ${params.consultationName} fue reagendada para:\n${when}\n\nVer tus citas: ${params.appointmentsUrl}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">${brand}</p>
      <h1 style="font-size:22px;font-weight:600">Cita reagendada</h1>
      <p>Hola <strong>${escapeHtml(params.name)}</strong>,</p>
      <p>Tu cita de <strong>${escapeHtml(params.consultationName)}</strong> quedó programada para:</p>
      <p style="font-size:16px;font-weight:600;color:#5a1728">${escapeHtml(when)}</p>
      <p style="margin:28px 0">
        <a href="${params.appointmentsUrl}" style="background:#5a1728;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
          Ver mis citas
        </a>
      </p>
    </div>
  `;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const VERIFY_TOKEN_PREFIX = "verify:";
export const RESET_TOKEN_PREFIX = "reset:";

export function verifyIdentifier(email: string) {
  return `${VERIFY_TOKEN_PREFIX}${email}`;
}

export function resetIdentifier(email: string) {
  return `${RESET_TOKEN_PREFIX}${email}`;
}
