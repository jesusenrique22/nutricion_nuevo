"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/socket-context";

interface LiveCounterOptions {
  /** Incrementa al recibir mensaje entrante (chat). */
  onMessageIncoming?: boolean;
  /** Incrementa cuando llega una notificación nueva. */
  onNotificationCreated?: boolean;
}

/**
 * Contador que se sincroniza con el servidor (router.refresh)
 * y sube al instante cuando llegan eventos socket.
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
    if (!socket) return;

    const onDashboardUpdate = (data: {
      scope?: string;
      action?: string;
    }) => {
      if (
        options.onNotificationCreated &&
        data.scope === "notifications" &&
        data.action === "created"
      ) {
        setCount((n) => n + 1);
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
  }, [socket, options.onMessageIncoming, options.onNotificationCreated]);

  return count;
}
