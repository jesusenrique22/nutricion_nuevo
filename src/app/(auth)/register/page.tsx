"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    if (!res.ok) {
      setError(res.message);
      setLoading(false);
      return;
    }

    // Auto-login tras registro
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-foreground/10 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Empieza tu camino hacia una vida más saludable.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Nombre completo</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
