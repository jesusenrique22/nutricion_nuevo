"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { verifyEmail } from "@/server/actions/auth.actions";
import { LoadingInline } from "@/components/ui/loading-indicator";

/** Cierra la sesión actual (si existe) y navega al login con hard redirect. */
async function goToLogin() {
  try {
    await signOut({ redirect: false });
  } catch {
    // Sin sesión activa — continuar igual.
  }
  window.location.assign(`${window.location.origin}/login?registered=1`);
}

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Enlace inválido.");
      return;
    }

    // Evitar doble ejecución (StrictMode / re-render) que consumiría el token.
    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    void (async () => {
      const res = await verifyEmail({ token, email });
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setMessage(res.message);
        return;
      }
      setStatus("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [token, email]);

  // Auto-redirigir al login 4 segundos después de verificar exitosamente.
  useEffect(() => {
    if (status !== "ok") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void goToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

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
      <p className="mt-2 text-xs text-foreground/50">
        Serás redirigido en {countdown} segundo{countdown !== 1 ? "s" : ""}…
      </p>
      <button
        type="button"
        onClick={() => void goToLogin()}
        className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Ir al login ahora
      </button>
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
