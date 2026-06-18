"use client";

import { useEffect, useState } from "react";
import { useLiveCounter } from "@/hooks/use-live-counter";

export function useDashboardBadges() {
  const [seed, setSeed] = useState({ notifications: 0 });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard/badges", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { notifications?: number } | null) => {
        if (cancelled || !data) return;
        setSeed({ notifications: data.notifications ?? 0 });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadNotifications = useLiveCounter(seed.notifications, {
    onNotificationEvents: true,
  });

  return { unreadNotifications };
}
