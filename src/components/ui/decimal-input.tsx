"use client";

import { useEffect, useId, useState } from "react";
import {
  clampNumber,
  formatDecimalForInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from "@/lib/number-input";

type DecimalInputProps = {
  value: number;
  onChange: (value: number) => void;
  /** Para enviar en FormData (input hidden). */
  name?: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxDecimals?: number;
  /** Si true, muestra vacío cuando el valor es 0 (no hay que borrar el cero). */
  emptyWhenZero?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function DecimalInput({
  value,
  onChange,
  name,
  required,
  min = 0,
  max,
  maxDecimals = 2,
  emptyWhenZero = true,
  placeholder = "0",
  className,
  id,
  disabled,
}: DecimalInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(() =>
    formatDecimalForInput(value, emptyWhenZero),
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDecimalForInput(value, emptyWhenZero));
    }
  }, [value, focused, emptyWhenZero]);

  function commitDisplay(raw: string) {
    const parsed = parseDecimalInput(raw);
    const next = clampNumber(parsed ?? 0, min, max);
    onChange(next);
    setText(formatDecimalForInput(next, emptyWhenZero));
  }

  return (
    <>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          let trimmed = text.trim();
          if (trimmed.endsWith(",") || trimmed.endsWith(".")) {
            trimmed = trimmed.slice(0, -1);
          }
          commitDisplay(trimmed);
        }}
        onChange={(e) => {
          const next = sanitizeDecimalInput(e.target.value, maxDecimals);
          setText(next);
          const parsed = parseDecimalInput(next);
          if (parsed !== null) {
            onChange(clampNumber(parsed, min, max));
          } else if (next === "" || next === "." || next === ",") {
            onChange(clampNumber(0, min, max));
          }
        }}
      />
      {name ? (
        <input type="hidden" name={name} value={String(value)} required={required} />
      ) : null}
    </>
  );
}
