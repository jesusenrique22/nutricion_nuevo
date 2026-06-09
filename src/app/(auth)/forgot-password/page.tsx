"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/server/actions/auth.actions";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          setDevLink(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await requestPasswordReset({
              email: fd.get("email"),
            });
            if (!res.ok) {
              setMessage(res.message);
              return;
            }
            setMessage(
              "Si el email está registrado, recibirás instrucciones en breve.",
            );
            if (res.devResetUrl) setDevLink(res.devResetUrl);
          });
        }}
      >
        <label className="block text-sm">
          <span className="font-semibold">Email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      {message && (
        <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">{message}</p>
      )}
      {devLink && (
        <p className="mt-3 break-all text-xs text-foreground/50">
          Dev:{" "}
          <Link href={devLink} className="text-primary underline">
            {devLink}
          </Link>
        </p>
      )}

      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← Volver al login
      </Link>
    </div>
  );
}
