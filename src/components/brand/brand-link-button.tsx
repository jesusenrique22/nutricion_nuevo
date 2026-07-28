"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function isAbsoluteHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href.trim());
}

export function BrandLinkButton({
  href,
  label,
  subtitle,
  external = false,
  onClick,
  selected = false,
  delay = 0,
  type = "link",
  disabled = false,
  wide = false,
  compact = false,
}: {
  href?: string;
  label: string;
  subtitle?: string;
  external?: boolean;
  onClick?: () => void;
  selected?: boolean;
  delay?: number;
  type?: "link" | "button";
  disabled?: boolean;
  wide?: boolean;
  compact?: boolean;
}) {
  const widthClass = wide ? "w-full" : "w-full max-w-[344px]";
  const sizeClass = compact
    ? "rounded-2xl px-2 py-2.5 sm:rounded-[28px] sm:px-4 sm:py-3.5"
    : "rounded-[28px] px-6 py-4";
  const labelClass = compact
    ? "max-w-full truncate text-[11px] font-semibold tracking-wide sm:text-sm"
    : "text-base font-semibold tracking-wide";
  const className = `group flex ${widthClass} flex-col items-center justify-center ${sizeClass} text-center transition disabled:pointer-events-none disabled:opacity-50 ${
    selected
      ? "bg-[#5a1728] text-primary-foreground ring-2 ring-accent-soft/50"
      : "bg-primary text-primary-foreground hover:bg-[#5a1728]"
  }`;

  const inner = (
    <>
      <span className={labelClass}>{label}</span>
      {subtitle && (
        <span className="mt-0.5 text-xs font-normal text-primary-foreground/75">
          {subtitle}
        </span>
      )}
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 22, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      delay,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
    whileHover: { scale: 1.05, y: -3 },
    whileTap: { scale: 0.97 },
  };

  if (type === "button" || onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...motionProps}
      >
        {inner}
      </motion.button>
    );
  }

  const resolvedHref = (href ?? "#").trim() || "#";
  // Redes / mailto / tel: <a> nativo (next/link no es ideal para externos).
  const useNativeAnchor = external || isAbsoluteHref(resolvedHref);

  return (
    <motion.div {...motionProps} className={wide ? "w-full" : "w-full max-w-[344px]"}>
      {useNativeAnchor ? (
        <a
          href={resolvedHref}
          target={external || resolvedHref.startsWith("http") ? "_blank" : undefined}
          rel={
            external || resolvedHref.startsWith("http")
              ? "noopener noreferrer"
              : undefined
          }
          className={className}
        >
          {inner}
        </a>
      ) : (
        <Link href={resolvedHref} className={className}>
          {inner}
        </Link>
      )}
    </motion.div>
  );
}
