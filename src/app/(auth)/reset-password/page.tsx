"use client";

import Link from "next/link";

/**
 * El flujo de recuperación por código ahora vive en /forgot-password.
 * Esta página se mantiene para redirigir a usuarios que tengan un enlace antiguo.
 */
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-base text-foreground/70">
        El enlace expiró o ya no es válido. Solicitá un nuevo código desde la
        página de recuperación.
      </p>
      <Link
        href="/forgot-password"
        className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        Recuperar contraseña
      </Link>
      <Link href="/login" className="text-sm text-foreground/55 hover:underline">
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
