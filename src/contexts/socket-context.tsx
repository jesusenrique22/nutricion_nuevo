"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getSocketClientUrl } from "@/lib/socket-config";

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
    const url = getSocketClientUrl();
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
