"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
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
      setError("Credenciales inválidas.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-foreground/10 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Ingresa para acceder a tu panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              className="mt-1 w-full rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-primary">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
