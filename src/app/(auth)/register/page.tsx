"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthFooterLink,
  AuthFormCard,
  AuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { LoadingButton } from "@/components/ui/loading-button";
import { isPasswordValid } from "@/lib/validators/password";
import { registerPatient } from "@/server/actions/auth.actions";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [pwdFocused, setPwdFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("La contraseña no cumple todos los requisitos.");
      setPwdFocused(true);
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };

    const res = await registerPatient(payload);
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }

    if (res.skipVerification) {
      router.push("/login?registered=1");
      return;
    }

    const email =
      typeof payload.email === "string" ? payload.email : res.email ?? "";
    const qs = new URLSearchParams({ email });
    if (res.verificationEmailFailed) qs.set("sendFailed", "1");
    router.push(`/check-email?${qs.toString()}`);
  }

  return (
    <AuthShell
      title="Empezá hoy"
      subtitle="Creá tu cuenta y accedé a consultas, recursos y seguimiento personalizado con Anttova."
    >
      <AuthFormCard>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          <div>
            <label className={authLabelClass}>Nombre completo</label>
            <input
              name="name"
              required
              autoComplete="name"
              className={authInputClass}
            />
          </div>
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
          <div className="relative">
            <PasswordInput
              label="Contraseña"
              required
              minLength={8}
              autoComplete="new-password"
              inputClassName={`${authInputClass} pr-12`}
              value={password}
              onValueChange={setPassword}
              onFocus={() => setPwdFocused(true)}
              onBlur={() => setPwdFocused(false)}
            />
            <PasswordRequirements
              password={password}
              visible={pwdFocused || password.length > 0}
            />
          </div>
          <p className="text-xs text-foreground/55 sm:text-sm">
            Te enviaremos un email para confirmar tu cuenta antes de ingresar.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Creando cuenta…"
            className={authButtonClass}
          >
            Registrarme
          </LoadingButton>
        </form>
      </AuthFormCard>

      <AuthFooterLink
        prompt="¿Ya tenés cuenta?"
        href="/login"
        label="Iniciá sesión"
      />
    </AuthShell>
  );
}
