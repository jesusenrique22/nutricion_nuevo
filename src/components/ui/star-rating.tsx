"use client";

import { useState } from "react";
import { REVIEW_RATING_MAX } from "@/types/review";

function StarIcon({
  filled,
  className = "",
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
    >
      <path d="M12 2.6l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.6z" />
    </svg>
  );
}

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

/** Estrellas de solo lectura para mostrar una calificación. */
export function StarDisplay({
  rating,
  size = "sm",
  className = "",
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const value = Math.round(rating);
  return (
    <div
      className={`inline-flex items-center gap-0.5 text-amber-400 ${className}`}
      role="img"
      aria-label={`${value} de ${REVIEW_RATING_MAX} estrellas`}
    >
      {Array.from({ length: REVIEW_RATING_MAX }).map((_, i) => (
        <StarIcon key={i} filled={i < value} className={SIZES[size]} />
      ))}
    </div>
  );
}

/** Selector interactivo de estrellas para formularios. */
export function StarRatingInput({
  value,
  onChange,
  size = "lg",
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: keyof typeof SIZES;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Calificación"
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: REVIEW_RATING_MAX }).map((_, i) => {
        const starValue = i + 1;
        const active = starValue <= shown;
        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} ${starValue === 1 ? "estrella" : "estrellas"}`}
            disabled={disabled}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHover(starValue)}
            className={`rounded-full p-0.5 transition-transform disabled:cursor-not-allowed ${
              active ? "text-amber-400" : "text-foreground/25"
            } ${!disabled && "hover:scale-110"}`}
          >
            <StarIcon filled={active} className={SIZES[size]} />
          </button>
        );
      })}
    </div>
  );
}
