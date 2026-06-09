"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/socket-context";
import { safeRouterRefresh } from "@/lib/safe-router";

const REFRESH_DEBOUNCE_MS = 400;

/**
 * Escucha eventos `dashboard:update` y refresca los Server Components
 * del panel sin recargar la página completa.
 */
export function RealtimeSync() {
  const router = useRouter();
  const socket = useSocket();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routerReady, setRouterReady] = useState(false);

  useEffect(() => {
    setRouterReady(true);
  }, []);

  useEffect(() => {
    if (!socket || !routerReady) return;

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        safeRouterRefresh(router);
        timerRef.current = null;
      }, REFRESH_DEBOUNCE_MS);
    };

    socket.on("dashboard:update", scheduleRefresh);

    return () => {
      socket.off("dashboard:update", scheduleRefresh);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket, router, routerReady]);

  return null;
}
