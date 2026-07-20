"use client";

import { useEffect, useState } from "react";
import { useLiveCounter } from "@/hooks/use-live-counter";

/** Si pasás initialNotifications (aunque sea 0), no se llama a /api/dashboard/badges. */
export function useDashboardBadges(initialNotifications?: number) {
  const seeded = initialNotifications !== undefined;
  const [seed, setSeed] = useState({
    notifications: initialNotifications ?? 0,
  });

  useEffect(() => {
    if (!seeded) return;
    setSeed({ notifications: initialNotifications });
  }, [seeded, initialNotifications]);

  useEffect(() => {
    if (seeded) return;

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
  }, [seeded]);

  const unreadNotifications = useLiveCounter(seed.notifications, {
    onNotificationEvents: true,
  });

  return { unreadNotifications };
}
