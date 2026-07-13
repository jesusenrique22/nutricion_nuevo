"use client";

import { RouteEnterMotion } from "@/components/motion/route-enter-motion";

/** Remonta y anima el contenido en cada navegación marketing. */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteEnterMotion>{children}</RouteEnterMotion>;
}
