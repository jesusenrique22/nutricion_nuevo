"use client";

import { RouteEnterMotion } from "@/components/motion/route-enter-motion";

export default function AuthTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteEnterMotion>{children}</RouteEnterMotion>;
}
