"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import {
  AuthFooterLink,
  AuthFormCard,
  AuthShell,
} from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";

function LoginForm() {
  const params = useSearchParams();
  const resetOk = params.get("reset") === "1";
  const registered = params.get("registered") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setError(
          "Tu email aún no está verificado. Revisá tu correo o reenviá el enlace.",
        );
        return;
      }
      setError("Credenciales inválidas.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <AuthFormCard>
      {resetOk && (
        <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          Contraseña actualizada. Ya podés iniciar sesión.
        </p>
      )}
      {registered && (
        <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          Cuenta creada. En desarrollo sin correo configurado ya podés ingresar.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 outline-none transition focus:border-primary"
          />
        </div>
        <PasswordInput
          label="Contraseña"
          required
          autoComplete="current-password"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
          <a
            href="/check-email"
            className="text-sm font-semibold text-foreground/55 hover:text-primary hover:underline"
          >
            Reenviar verificación
          </a>
        </div>
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            {error.includes("verificado") && (
              <a
                href="/check-email"
                className="text-sm font-semibold text-primary underline"
              >
                Ir a verificación de email
              </a>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-[28px] bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </AuthFormCard>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Bienvenid@"
      subtitle="Ingresá a tu panel para ver citas, estadísticas, planes y seguimiento con Anttova."
    >
      <Suspense>
        <LoginForm />
      </Suspense>

      <AuthFooterLink
        prompt="¿No tenés cuenta?"
        href="/register"
        label="Registrate"
      />
    </AuthShell>
  );
}
