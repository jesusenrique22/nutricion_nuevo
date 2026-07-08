import type { ReactNode } from "react";

type DashboardPageWidth = "default" | "wide" | "full";

const widthClass: Record<DashboardPageWidth, string> = {
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function DashboardPage({
  children,
  className = "",
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: DashboardPageWidth;
}) {
  return (
    <div
      className={`mx-auto w-full min-w-0 ${widthClass[width]} ${className}`}
    >
      {children}
    </div>
  );
}
