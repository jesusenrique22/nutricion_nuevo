import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
  inverted?: boolean;
  /** Marcar en logos above-the-fold (header, hero) para mejorar LCP. */
  priority?: boolean;
};

const logoHeight = {
  sm: 16,
  md: 20,
  lg: 32,
};

export function BrandLogo({
  className = "",
  size = "md",
  tagline = false,
  inverted = false,
  priority,
}: BrandLogoProps) {
  const height = logoHeight[size];
  const width = Math.round(height * (83 / 15));
  const eager = priority ?? size === "lg";

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <Image
        src={inverted ? "/brand/logo-white.svg" : "/brand/logo-burgundy.svg"}
        alt="Anttova"
        width={width}
        height={height}
        priority={eager}
        loading={eager ? "eager" : undefined}
        className="h-auto w-auto"
        style={{ height, width: "auto", maxWidth: width }}
      />
      {tagline && (
        <span
          className={`mt-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] ${inverted ? "text-accent-soft" : "text-foreground/70"}`}
        >
          Nutrición · Fitness · Wellness
        </span>
      )}
    </span>
  );
}

export function BrandLogoLink({
  href = "/",
  ...props
}: BrandLogoProps & { href?: string }) {
  return (
    <Link href={href}>
      <BrandLogo {...props} />
    </Link>
  );
}
