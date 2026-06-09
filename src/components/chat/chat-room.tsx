"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendChatMessage,
  type ChatPageData,
  type MessageDTO,
} from "@/server/actions/chat.actions";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";

export function ChatRoom({
  initialData,
  className = "",
}: {
  initialData: ChatPageData;
  className?: string;
}) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialData.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleIncoming = useCallback(
    (msg: MessageDTO) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    [],
  );

  const { emitMessage } = useChatSocket(
    initialData.conversationId,
    handleIncoming,
  );

  async function handleSendText(text: string) {
    const res = await sendChatMessage({
      conversationId: initialData.conversationId,
      type: "TEXT",
      text,
    });
    if (!res.ok) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    emitMessage(res.message);
  }

  async function handleSendFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("conversationId", initialData.conversationId);

    const uploadRes = await fetch("/api/chat/upload", {
      method: "POST",
      body: fd,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      alert(err.error ?? "Error al subir archivo");
      return;
    }

    const uploaded = await uploadRes.json();
    const res = await sendChatMessage({
      conversationId: initialData.conversationId,
      type: uploaded.messageType,
      attachment: {
        fileId: uploaded.fileId,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
        sizeBytes: uploaded.sizeBytes,
      },
    });
    if (!res.ok) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    emitMessage(res.message);
  }

  return (
    <div
      className={`flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-white ${className}`}
    >
      <div className="shrink-0 border-b border-foreground/10 px-5 py-4">
        <h2 className="font-bold">{initialData.otherUserName}</h2>
        <p className="text-xs text-foreground/50">Chat privado</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-foreground/50">
            Aún no hay mensajes. ¡Envía el primero!
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSendText={handleSendText} onSendFile={handleSendFile} />
    </div>
  );
}
