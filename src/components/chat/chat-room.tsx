"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConversationFiles,
  sendChatMessage,
  sendChatSticker,
  type ChatFileDTO,
  type ChatPageData,
  type MessageDTO,
} from "@/server/actions/chat.actions";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatFilesPanel } from "@/components/chat/chat-files-panel";
import { ChatNotice } from "@/components/ui/chat-notice";

type ChatTab = "chat" | "files";

function messageToFile(
  message: MessageDTO,
  senderName: string,
  currentUserId: string,
): ChatFileDTO | null {
  if (!message.attachment || message.type === "STICKER") return null;
  return {
    id: message.id,
    messageId: message.id,
    fileName: message.attachment.fileName,
    url: message.attachment.url,
    mimeType: message.attachment.mimeType,
    sizeBytes: message.attachment.sizeBytes,
    type: message.type,
    createdAt: message.createdAt,
    senderId: message.senderId,
    senderName,
    isMine: message.senderId === currentUserId,
  };
}

export function ChatRoom({
  initialData,
  className = "",
}: {
  initialData: ChatPageData;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<ChatTab>("chat");
  const [messages, setMessages] = useState<MessageDTO[]>(initialData.messages);
  const [files, setFiles] = useState<ChatFileDTO[]>(() =>
    initialData.messages
      .filter((m) => m.attachment && m.type !== "STICKER")
      .map((m) =>
        messageToFile(
          m,
          m.isMine ? "Tú" : initialData.otherUserName,
          initialData.currentUserId,
        ),
      )
      .filter((f): f is ChatFileDTO => f !== null)
      .reverse(),
  );
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showError(message: string) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (activeTab === "chat") scrollToBottom();
  }, [messages, activeTab, scrollToBottom]);

  const loadFiles = useCallback(async () => {
    if (!initialData.conversationId) return;
    setFilesLoading(true);
    try {
      const list = await getConversationFiles(initialData.conversationId);
      setFiles(list);
      setFilesLoaded(true);
    } finally {
      setFilesLoading(false);
    }
  }, [initialData.conversationId]);

  useEffect(() => {
    if (activeTab === "files" && !filesLoaded) {
      void loadFiles();
    }
  }, [activeTab, filesLoaded, loadFiles]);

  const appendFileFromMessage = useCallback(
    (message: MessageDTO) => {
      if (!message.attachment) return;
      const senderName = message.isMine
        ? "Tú"
        : initialData.otherUserName;
      const file = messageToFile(
        message,
        senderName,
        initialData.currentUserId,
      );
      if (!file) return;
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [file, ...prev];
      });
    },
    [initialData.currentUserId, initialData.otherUserName],
  );

  const handleIncoming = useCallback(
    (msg: MessageDTO) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      appendFileFromMessage(msg);
    },
    [appendFileFromMessage],
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
      showError(err.error ?? "Error al subir archivo");
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
    if (!res.ok) {
      showError(res.message);
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    appendFileFromMessage(res.message);
    emitMessage(res.message);
  }

  async function handleSendSticker(stickerId: string) {
    const res = await sendChatSticker({
      conversationId: initialData.conversationId,
      stickerId,
    });
    if (!res.ok) {
      showError(res.message);
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    emitMessage(res.message);
  }

  const fileCount = files.length;

  return (
    <div
      className={`relative flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-white ${className}`}
    >
      <ChatNotice message={notice} onClose={() => setNotice(null)} />

      <div className="shrink-0 border-b border-foreground/10 px-5 py-4">
        <h2 className="font-bold">{initialData.otherUserName}</h2>
        <p className="text-xs text-foreground/50">
          {initialData.consultationLabel}
        </p>

        <div className="mt-3 flex gap-1 rounded-full bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === "chat"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === "files"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Archivos
            {fileCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === "files"
                    ? "bg-white/20 text-white"
                    : "bg-accent text-white"
                }`}
              >
                {fileCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
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
          <ChatInput
            onSendText={handleSendText}
            onSendFile={handleSendFile}
            onSendSticker={handleSendSticker}
          />
        </>
      ) : (
        <ChatFilesPanel files={files} loading={filesLoading} />
      )}
    </div>
  );
}
