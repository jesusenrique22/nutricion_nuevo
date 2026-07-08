import type { HTMLAttributes } from "react";

type LoadingSize = "sm" | "md" | "lg";
type LoadingVariant = "brand" | "onPrimary" | "muted";

const sizeStyles: Record<
  LoadingSize,
  { bar: string; gap: string; height: string }
> = {
  sm: { bar: "w-1", gap: "gap-0.5", height: "h-3" },
  md: { bar: "w-1.5", gap: "gap-1", height: "h-5" },
  lg: { bar: "w-2", gap: "gap-1.5", height: "h-8" },
};

const barColors: Record<LoadingVariant, [string, string, string]> = {
  brand: ["bg-primary", "bg-accent", "bg-accent-soft"],
  onPrimary: [
    "bg-primary-foreground",
    "bg-primary-foreground/80",
    "bg-primary-foreground/55",
  ],
  muted: ["bg-foreground/70", "bg-foreground/45", "bg-foreground/30"],
};

export function LoadingIndicator({
  size = "md",
  variant = "brand",
  label = "Cargando",
  className = "",
}: {
  size?: LoadingSize;
  variant?: LoadingVariant;
  label?: string;
  className?: string;
}) {
  const styles = sizeStyles[size];
  const colors = barColors[variant];
  const delays = ["0ms", "130ms", "260ms"];

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex items-end ${styles.gap} ${styles.height} ${className}`}
    >
      <span className="sr-only">{label}</span>
      {colors.map((color, index) => (
        <span
          key={index}
          className={`${styles.bar} h-full rounded-full ${color} anttova-wave-bar`}
          style={{ animationDelay: delays[index] }}
        />
      ))}
    </span>
  );
}

export function LoadingInline({
  label = "Cargando…",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-foreground/55 ${className}`}
      {...props}
    >
      <LoadingIndicator size="sm" label={label} />
      <span>{label}</span>
    </span>
  );
}
