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
