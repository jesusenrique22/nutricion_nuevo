"use client";

import { useId } from "react";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  digitsOnly,
  findPhoneCountry,
} from "@/lib/phone-countries";

export type PhoneFieldValue = {
  /** ISO 3166-1 alpha-2 del país elegido. */
  country: string;
  /** Número nacional, solo dígitos, sin prefijo. */
  number: string;
};

export const emptyPhoneValue: PhoneFieldValue = {
  country: DEFAULT_PHONE_COUNTRY,
  number: "",
};

/**
 * Teléfono en dos partes: el país aporta el prefijo (+54, +58…) y el paciente
 * escribe únicamente su número. El input no lleva placeholder de ejemplo.
 */
export function PhoneField({
  value,
  onChange,
  label = "Número de teléfono",
  required = true,
  disabled,
  hint,
  inputClassName = "",
  labelClassName = "",
}: {
  value: PhoneFieldValue;
  onChange: (next: PhoneFieldValue) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const inputId = useId();
  const selectId = useId();
  const country = findPhoneCountry(value.country);

  return (
    <div>
      <label className={labelClassName} htmlFor={inputId}>
        {label}
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 sm:w-[15.5rem] sm:shrink-0">
          <select
            id={selectId}
            aria-label="País"
            value={value.country}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className={`${inputClassName} w-full cursor-pointer appearance-none pr-8`}
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} +{c.dial}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground/45"
          >
            ▾
          </span>
        </div>
        <input
          id={inputId}
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={value.number}
          onChange={(e) =>
            onChange({ ...value, number: digitsOnly(e.target.value) })
          }
          className={`${inputClassName} min-w-0 flex-1`}
        />
      </div>
      <p className="mt-1.5 text-xs text-foreground/55">
        {hint ??
          `Se guardará como +${country?.dial ?? ""} seguido de tu número${
            country ? ` (${country.name})` : ""
          }.`}
      </p>
    </div>
  );
}
