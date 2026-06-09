"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthFooterLink,
  AuthFormCard,
  AuthShell,
} from "@/components/auth/auth-shell";
import { registerPatient } from "@/server/actions/auth.actions";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
    router.push(`/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      title="Empezá hoy"
      subtitle="Creá tu cuenta y accedé a consultas, formularios y seguimiento personalizado con Anttova."
    >
      <AuthFormCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Nombre completo</label>
            <input
              name="name"
              required
              autoComplete="name"
              className="mt-1 w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 outline-none transition focus:border-primary"
            />
          </div>
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
          <div>
            <label className="text-sm font-semibold">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 outline-none transition focus:border-primary"
            />
          </div>
          <p className="text-xs text-foreground/55">
            Te enviaremos un email para confirmar tu cuenta antes de ingresar.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-[28px] bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? "Creando cuenta…" : "Registrarme"}
          </button>
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
