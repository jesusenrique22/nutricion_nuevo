"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";

/**
 * Cierra sesión y se queda en el host actual (localhost o Vercel).
 * No usar solo `callbackUrl: "/"`: Auth.js lo resuelve con AUTH_URL/NEXTAUTH_URL
 * del .env (a menudo la URL de producción) y te manda a Vercel aunque estés en local.
 */
export function SignOutButton({
  className,
  label = "Cerrar sesión",
  redirectTo = "/",
}: {
  className?: string;
  label?: string;
  redirectTo?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function handleClick() {
    if (busy || isPending) return;
    setBusy(true);
    startTransition(() => {
      void (async () => {
        const destination = new URL(
          redirectTo,
          window.location.origin,
        ).toString();
        try {
          await signOut({ redirect: false });
        } catch {
          // Seguir igual: borrar cookies locales vía navegación.
        }
        window.location.assign(destination);
      })();
    });
  }

  return (
    <button
      type="button"
      disabled={busy || isPending}
      onClick={handleClick}
      className={className}
    >
      {busy || isPending ? "Saliendo…" : label}
    </button>
  );
}
