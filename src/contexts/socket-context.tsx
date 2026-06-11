"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({
  children,
  userId,
  role,
}: {
  children: ReactNode;
  userId: string;
  role: "ADMIN" | "PATIENT";
}) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    const isBrowser = typeof window !== "undefined";
    const onProdHost =
      isBrowser && !/localhost|127\.0\.0\.1/.test(window.location.hostname);
    const url =
      configured && !(onProdHost && /localhost|127\.0\.0\.1/.test(configured))
        ? configured
        : onProdHost
          ? null
          : (configured ?? "http://localhost:3001");

    if (!url) return;

    const instance = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    const joinRooms = () => {
      instance.emit("join_user", { userId, role });
    };

    instance.on("connect", joinRooms);
    if (instance.connected) joinRooms();

    setSocket(instance);

    return () => {
      instance.off("connect", joinRooms);
      instance.disconnect();
      setSocket(null);
    };
  }, [userId, role]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
