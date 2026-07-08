"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { verifyEmail } from "@/server/actions/auth.actions";
import { LoadingInline } from "@/components/ui/loading-indicator";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Enlace inválido.");
      return;
    }

    startTransition(async () => {
      const res = await verifyEmail({ token, email });
      if (!res.ok) {
        setStatus("error");
        setMessage(res.message);
        return;
      }
      setStatus("ok");
    });
  }, [token, email]);

  if (status === "loading") {
    return (
      <div className="mt-6">
        <LoadingInline label="Verificando tu cuenta…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-6">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {message}
        </p>
        <Link
          href={`/check-email?email=${encodeURIComponent(email)}`}
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Reenviar verificación →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm">
        ¡Email verificado! Ya podés iniciar sesión.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Ir al login
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Verificar email</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Estamos confirmando tu cuenta de Anttova.
      </p>
      <Suspense>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
