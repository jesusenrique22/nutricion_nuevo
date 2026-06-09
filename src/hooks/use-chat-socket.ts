"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/contexts/socket-context";
import type { MessageDTO } from "@/server/actions/chat.actions";

export function useChatSocket(
  conversationId: string | null,
  onMessage: (message: MessageDTO) => void,
) {
  const socket = useSocket();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("join", conversationId);

    const handler = (payload: MessageDTO & { conversationId?: string }) => {
      if (payload.conversationId && payload.conversationId !== conversationId) {
        return;
      }
      onMessageRef.current(payload);
    };
    socket.on("message", handler);

    return () => {
      socket.off("message", handler);
    };
  }, [socket, conversationId]);

  const emitMessage = useCallback(
    (message: MessageDTO) => {
      if (!socket || !conversationId) return;
      socket.emit("message", {
        conversationId,
        ...message,
      });
    },
    [socket, conversationId],
  );

  return { emitMessage };
}
