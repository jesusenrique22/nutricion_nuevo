"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/socket-context";
import {
  NOTIFICATION_COUNT_EVENT,
  type NotificationCountEventDetail,
} from "@/lib/notification-count-events";

interface LiveCounterOptions {
  /** Incrementa al recibir mensaje entrante (chat). */
  onMessageIncoming?: boolean;
  /** Sincroniza con notificaciones (crear / leer). */
  onNotificationEvents?: boolean;
}

function applyNotificationDetail(
  count: number,
  detail: NotificationCountEventDetail,
): number {
  if ("count" in detail) return Math.max(0, detail.count);
  return Math.max(0, count + detail.delta);
}

/**
 * Contador que se sincroniza con el servidor (router.refresh)
 * y se actualiza al instante con eventos socket o del mismo tab.
 */
export function useLiveCounter(
  initial: number,
  options: LiveCounterOptions = {},
) {
  const socket = useSocket();
  const [count, setCount] = useState(initial);

  useEffect(() => {
    setCount(initial);
  }, [initial]);

  useEffect(() => {
    if (!options.onNotificationEvents) return;

    const onLocalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<NotificationCountEventDetail>).detail;
      if (!detail) return;
      setCount((current) => applyNotificationDetail(current, detail));
    };

    window.addEventListener(NOTIFICATION_COUNT_EVENT, onLocalUpdate);
    return () => {
      window.removeEventListener(NOTIFICATION_COUNT_EVENT, onLocalUpdate);
    };
  }, [options.onNotificationEvents]);

  useEffect(() => {
    if (!socket) return;

    const onDashboardUpdate = (data: {
      scope?: string;
      action?: string;
      delta?: number;
    }) => {
      if (!options.onNotificationEvents || data.scope !== "notifications") {
        return;
      }

      if (data.action === "created") {
        setCount((n) => n + 1);
        return;
      }

      if (data.action === "read_all") {
        setCount(0);
        return;
      }

      if (data.action === "read") {
        const delta = typeof data.delta === "number" ? data.delta : -1;
        setCount((n) => Math.max(0, n + delta));
      }
    };

    const onMessageIncoming = () => {
      if (options.onMessageIncoming) {
        setCount((n) => n + 1);
      }
    };

    socket.on("dashboard:update", onDashboardUpdate);
    if (options.onMessageIncoming) {
      socket.on("message:incoming", onMessageIncoming);
    }

    return () => {
      socket.off("dashboard:update", onDashboardUpdate);
      if (options.onMessageIncoming) {
        socket.off("message:incoming", onMessageIncoming);
      }
    };
  }, [socket, options.onMessageIncoming, options.onNotificationEvents]);

  return count;
}
