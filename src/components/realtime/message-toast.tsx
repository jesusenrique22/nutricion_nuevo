"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/contexts/socket-context";
import type {
  IncomingMessageToast,
  MessageIncomingPayload,
} from "@/types/message-toast";

const TOAST_TTL_MS = 5000;
const MAX_TOASTS = 3;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function MessageToast() {
  const socket = useSocket();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<IncomingMessageToast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (payload: MessageIncomingPayload) => {
      const onChatPage = pathname.startsWith("/dashboard/chat");
      const activeConversation = searchParams.get("conversation");

      if (onChatPage) {
        if (!activeConversation || activeConversation === payload.conversationId) {
          return;
        }
      }

      const id = `${payload.conversationId}-${Date.now()}`;
      const toast: IncomingMessageToast = { id, ...payload };

      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), toast]);

      const timer = setTimeout(() => dismiss(id), TOAST_TTL_MS);
      timersRef.current.set(id, timer);
    },
    [pathname, searchParams, dismiss],
  );

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: MessageIncomingPayload) => {
      showToast(payload);
    };

    socket.on("message:incoming", handler);
    return () => {
      socket.off("message:incoming", handler);
    };
  }, [socket, showToast]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(100vw-2.5rem,18rem)] flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto"
          >
            <Link
              href={toast.deepLink}
              onClick={() => dismiss(toast.id)}
              className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-white p-3 shadow-lg shadow-primary/10 transition hover:shadow-xl"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {initials(toast.senderName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {toast.senderName}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-foreground/60">
                  {toast.preview}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss(toast.id);
                }}
                className="shrink-0 rounded-full p-1 text-foreground/40 transition hover:bg-muted hover:text-foreground"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3 3l8 8M11 3l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
