"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { resendVerificationEmail } from "@/server/actions/auth.actions";

function CheckEmailContent() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(
    initialEmail
      ? "Te enviamos un correo con el enlace de verificación. Revisá también spam."
      : null,
  );
  const [devLink, setDevLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <p className="mt-2 text-sm text-foreground/60">
        Revisá tu bandeja de entrada y hacé clic en el enlace para activar tu
        cuenta. Sin verificación no podés iniciar sesión.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          setDevLink(null);
          startTransition(async () => {
            const res = await resendVerificationEmail({ email });
            if (!res.ok) {
              setMessage(res.message);
              return;
            }
            setMessage(
              "Si el email está registrado y pendiente de verificación, enviamos un nuevo enlace.",
            );
            if (res.devVerifyUrl) setDevLink(res.devVerifyUrl);
          });
        }}
      >
        <label className="block text-sm">
          <span className="font-semibold">Email</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Enviando…" : "Reenviar enlace"}
        </button>
      </form>

      {message && (
        <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">{message}</p>
      )}
      {devLink && (
        <p className="mt-3 break-all text-xs text-foreground/50">
          Dev (sin SMTP):{" "}
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
    </>
  );
}

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Revisá tu email</h1>
      <Suspense>
        <CheckEmailContent />
      </Suspense>
    </div>
  );
}
