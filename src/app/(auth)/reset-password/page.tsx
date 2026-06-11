"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { resetPassword } from "@/server/actions/auth.actions";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token || !email) {
    return (
      <p className="text-sm text-red-600">
        Enlace inválido. Solicita uno nuevo desde{" "}
        <Link href="/forgot-password" className="underline">
          recuperar contraseña
        </Link>
        .
      </p>
    );
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await resetPassword({
            token,
            email,
            password: fd.get("password"),
          });
          if (!res.ok) {
            setMessage(res.message);
            return;
          }
          router.push("/login?reset=1");
        });
      }}
    >
      <PasswordInput
        label="Nueva contraseña"
        required
        minLength={8}
        autoComplete="new-password"
        inputClassName="w-full rounded-xl border border-foreground/15 bg-background px-4 py-2.5 pr-12 outline-none transition focus:border-primary"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Restablecer contraseña"}
      </button>
      {message && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Elige una contraseña segura (mínimo 8 caracteres).
      </p>
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
