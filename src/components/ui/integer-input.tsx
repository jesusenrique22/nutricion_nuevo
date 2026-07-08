"use client";

import { useEffect, useId, useState } from "react";
import {
  clampNumber,
  formatIntegerForInput,
  parseIntegerInput,
  sanitizeIntegerInput,
} from "@/lib/number-input";

type IntegerInputProps = {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  required?: boolean;
  min?: number;
  max?: number;
  emptyWhenZero?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function IntegerInput({
  value,
  onChange,
  name,
  required,
  min,
  max,
  emptyWhenZero = true,
  placeholder = "0",
  className,
  id,
  disabled,
}: IntegerInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(() =>
    formatIntegerForInput(value, emptyWhenZero),
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatIntegerForInput(value, emptyWhenZero));
    }
  }, [value, focused, emptyWhenZero]);

  function commitDisplay(raw: string) {
    const parsed = parseIntegerInput(raw);
    const next = clampNumber(parsed ?? 0, min, max);
    onChange(next);
    setText(formatIntegerForInput(next, emptyWhenZero));
  }

  return (
    <>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commitDisplay(text.trim());
        }}
        onChange={(e) => {
          const next = sanitizeIntegerInput(e.target.value);
          setText(next);
          const parsed = parseIntegerInput(next);
          if (parsed !== null) {
            onChange(clampNumber(parsed, min, max));
          } else if (next === "") {
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
