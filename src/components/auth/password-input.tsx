"use client";

import { useId, useState } from "react";
import { authLabelClass } from "@/components/auth/auth-shell";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export function PasswordInput({
  name = "password",
  label,
  required,
  minLength,
  autoComplete,
  className,
  inputClassName,
  value,
  onValueChange,
  onFocus,
  onBlur,
}: {
  name?: string;
  label?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  const inputClasses =
    inputClassName ??
    "w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 pr-12 outline-none transition focus:border-primary";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={authLabelClass}>
          {label}
        </label>
      )}
      <div className={label ? "relative mt-1.5" : "relative"}>
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={inputClasses}
          {...(value !== undefined ? { value } : {})}
          onChange={
            onValueChange ? (e) => onValueChange(e.target.value) : undefined
          }
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-foreground/45 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
