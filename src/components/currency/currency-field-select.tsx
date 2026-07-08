import { CURRENCY_LABELS } from "@/lib/currency/constants";
import type { SupportedCurrency } from "@/lib/currency/types";

export function CurrencyFieldSelect({
  value,
  onChange,
  className,
  id,
  required,
}: {
  value: SupportedCurrency | string;
  onChange: (currency: SupportedCurrency) => void;
  className?: string;
  id?: string;
  required?: boolean;
}) {
  const normalized: SupportedCurrency = value === "USD" ? "USD" : "ARS";

  return (
    <select
      id={id}
      required={required}
      value={normalized}
      onChange={(e) => onChange(e.target.value as SupportedCurrency)}
      className={className}
    >
      {(Object.keys(CURRENCY_LABELS) as SupportedCurrency[]).map((code) => (
        <option key={code} value={code}>
          {CURRENCY_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
