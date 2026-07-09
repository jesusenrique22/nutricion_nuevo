"use client";

import { getPasswordChecks } from "@/lib/validators/password";

function CheckIcon({ met }: { met: boolean }) {
  if (met) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 text-emerald-600"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="h-3.5 w-3.5 text-foreground/30"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/**
 * Panel flotante con el estado en vivo de cada requisito de contraseña.
 * Se muestra mientras el campo está enfocado o tiene contenido.
 */
export function PasswordRequirements({
  password,
  visible,
}: {
  password: string;
  visible: boolean;
}) {
  const checks = getPasswordChecks(password);
  const allMet = checks.every((c) => c.met);

  if (!visible || (allMet && password.length > 0)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-foreground/10 bg-white p-4 shadow-lg ring-1 ring-foreground/5"
    >
      <p className="mb-2 text-xs font-semibold text-foreground/70">
        Tu contraseña debe tener:
      </p>
      <ul className="space-y-1.5">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`flex items-center gap-2 text-xs transition-colors ${
              check.met ? "text-emerald-700" : "text-foreground/55"
            }`}
          >
            <CheckIcon met={check.met} />
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
