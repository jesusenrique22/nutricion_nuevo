"use client";

import { RouteEnterMotion } from "@/components/motion/route-enter-motion";

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteEnterMotion>{children}</RouteEnterMotion>;
}
