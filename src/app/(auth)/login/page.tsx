"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import {
  AuthFooterLink,
  AuthFormCard,
  AuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { LoadingButton } from "@/components/ui/loading-button";

function redirectAfterLogin() {
  window.location.assign(`${window.location.origin}/dashboard`);
}

function LoginForm() {
  const params = useSearchParams();
  const resetOk = params.get("reset") === "1";
  const registered = params.get("registered") === "1";
  const deactivated = params.get("deactivated") === "1";
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
    if (res?.error) {
      setLoading(false);
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setError(
          "Tu email aún no está verificado. Revisá tu correo o reenviá el enlace.",
        );
        return;
      }
      if (res.error === "ACCOUNT_DEACTIVATED") {
        setError(
          "Esta cuenta fue desactivada. Contactá a Anttova si necesitás ayuda.",
        );
        return;
      }
      if (res.error === "Configuration") {
        setError(
          "No se pudo conectar con la base de datos. Revisá DATABASE_URL en el hosting.",
        );
        return;
      }
      setError("Credenciales inválidas.");
      return;
    }
    redirectAfterLogin();
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
      {deactivated && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Esta cuenta fue desactivada. Si creés que es un error, contactá a
          Anttova.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
        <div>
          <label className={authLabelClass}>Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={authInputClass}
          />
        </div>
        <PasswordInput
          label="Contraseña"
          required
          autoComplete="current-password"
          inputClassName={`${authInputClass} pr-12`}
        />
        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline sm:text-base"
          >
            ¿Olvidaste tu contraseña?
          </a>
          <a
            href="/check-email"
            className="text-sm font-semibold text-foreground/55 hover:text-primary hover:underline sm:text-base"
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
        <LoadingButton
          type="submit"
          loading={loading}
          loadingLabel="Ingresando…"
          className={authButtonClass}
        >
          Iniciar sesión
        </LoadingButton>
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
