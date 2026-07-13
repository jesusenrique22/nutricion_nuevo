"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validators/password";
import {
  requestPasswordResetCode,
  verifyResetCode,
  resetPasswordWithCode,
} from "@/server/actions/auth.actions";
import {
  AuthFormCard,
  AuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/auth/auth-shell";
import { LoadingButton } from "@/components/ui/loading-button";

type Step = "email" | "code" | "password";

function ForgotPasswordFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(
    // En dev sin SMTP el código aparece en la URL como ?dev_code=
    params.get("dev_code") ?? null,
  );
  const [isPending, startTransition] = useTransition();

  // ── Paso 1: solicitar código ────────────────────────────────────────────
  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDevLink(null);
    const fd = new FormData(e.currentTarget);
    const inputEmail = fd.get("email") as string;
    startTransition(async () => {
      const res = await requestPasswordResetCode({ email: inputEmail });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setEmail(inputEmail);
      if ("devResetUrl" in res && res.devResetUrl) {
        setDevLink(res.devResetUrl);
      }
      setStep("code");
    });
  }

  // ── Paso 2: verificar código ────────────────────────────────────────────
  function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const inputCode = (fd.get("code") as string).trim();
    startTransition(async () => {
      const res = await verifyResetCode({ email, code: inputCode });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setCode(inputCode);
      setStep("password");
    });
  }

  // ── Paso 3: nueva contraseña ────────────────────────────────────────────
  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await resetPasswordWithCode({
        email,
        code,
        password: fd.get("password"),
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/login?reset=1");
    });
  }

  return (
    <AuthFormCard>
      {/* Indicador de pasos */}
      <div className="mb-6 flex items-center gap-2">
        {(["email", "code", "password"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < (["email", "code", "password"] as Step[]).indexOf(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-foreground/10 text-foreground/40"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`h-px w-6 transition-colors ${
                  i < (["email", "code", "password"] as Step[]).indexOf(step)
                    ? "bg-primary/40"
                    : "bg-foreground/10"
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-foreground/50">
          {step === "email" && "Ingresá tu email"}
          {step === "code" && "Ingresá el código"}
          {step === "password" && "Nueva contraseña"}
        </span>
      </div>

      {/* Paso 1: Email */}
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div>
            <label className={authLabelClass}>Email de tu cuenta</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className={authInputClass}
            />
          </div>
          <p className="text-xs text-foreground/55">
            Te enviaremos un código de 6 dígitos a tu correo. Válido por 15 minutos.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <LoadingButton
            type="submit"
            loading={isPending}
            loadingLabel="Enviando…"
            className={authButtonClass}
          >
            Enviar código
          </LoadingButton>
          {devLink && (
            <p className="break-all rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dev (sin SMTP): código visible en la URL:{" "}
              <Link href={devLink} className="font-mono font-bold underline">
                {devLink}
              </Link>
            </p>
          )}
        </form>
      )}

      {/* Paso 2: Código */}
      {step === "code" && (
        <form onSubmit={handleCodeSubmit} className="space-y-5">
          <p className="rounded-xl bg-primary/8 px-4 py-3 text-sm">
            Enviamos un código de 6 dígitos a <strong>{email}</strong>.
            Revisá tu bandeja de entrada (y la carpeta de spam).
          </p>
          <div>
            <label className={authLabelClass}>Código de verificación</label>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              placeholder="000000"
              className={`${authInputClass} text-center font-mono text-2xl tracking-[0.4em]`}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <LoadingButton
            type="submit"
            loading={isPending}
            loadingLabel="Verificando…"
            className={authButtonClass}
          >
            Verificar código
          </LoadingButton>
          <button
            type="button"
            disabled={isPending}
            className="w-full text-center text-sm text-foreground/55 hover:text-primary hover:underline disabled:opacity-50"
            onClick={() => {
              setError(null);
              setStep("email");
            }}
          >
            No recibí el código — reenviar
          </button>
        </form>
      )}

      {/* Paso 3: Nueva contraseña */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <p className="rounded-xl bg-primary/8 px-4 py-3 text-sm">
            Código verificado. Elegí tu nueva contraseña.
          </p>
          <PasswordInput
            label="Nueva contraseña"
            required
            minLength={8}
            autoComplete="new-password"
            inputClassName={`${authInputClass} pr-12`}
          />
          <p className="text-xs text-foreground/55">{PASSWORD_REQUIREMENTS_HINT}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <LoadingButton
            type="submit"
            loading={isPending}
            loadingLabel="Guardando…"
            className={authButtonClass}
          >
            Guardar nueva contraseña
          </LoadingButton>
        </form>
      )}
    </AuthFormCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar"
      subtitle="Te enviamos un código a tu correo para verificar tu identidad antes de cambiar la contraseña."
      formTitle="Restablecer"
      formHint="Ingresá tu email y seguí los pasos del código."
    >
      <Suspense>
        <ForgotPasswordFlow />
      </Suspense>

      <p className="mt-6 pb-4 text-center text-sm text-foreground/65">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  );
}
