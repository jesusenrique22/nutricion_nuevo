"use client";

import { useEffect, useState } from "react";
import { useLiveCounter } from "@/hooks/use-live-counter";

/**
 * Carga badges del sidebar en segundo plano para no bloquear el layout.
 * Los contadores siguen sincronizándose con socket y eventos locales.
 */
export function useDashboardBadges() {
  const [seed, setSeed] = useState({ notifications: 0, chat: 0 });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard/badges", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { notifications?: number; chat?: number } | null) => {
        if (cancelled || !data) return;
        setSeed({
          notifications: data.notifications ?? 0,
          chat: data.chat ?? 0,
        });
      })
      .catch(() => {
        // Mongo/socket opcional: el panel sigue usable sin badges.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadNotifications = useLiveCounter(seed.notifications, {
    onNotificationEvents: true,
  });
  const unreadChat = useLiveCounter(seed.chat, {
    onMessageIncoming: true,
  });

  return { unreadNotifications, unreadChat };
}
