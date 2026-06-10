"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CHAT_STICKERS } from "@/lib/chat-stickers";

export function ChatInput({
  onSendText,
  onSendFile,
  onSendSticker,
  disabled,
}: {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onSendSticker: (stickerId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStickers) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        stickerRef.current &&
        !stickerRef.current.contains(e.target as Node)
      ) {
        setShowStickers(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStickers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSendText(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    setSending(true);
    try {
      await onSendFile(file);
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSticker(stickerId: string) {
    if (sending) return;
    setSending(true);
    setShowStickers(false);
    try {
      await onSendSticker(stickerId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative shrink-0 border-t border-foreground/10 bg-white">
      {showStickers && (
        <div
          ref={stickerRef}
          className="absolute bottom-full left-0 right-0 z-10 border-t border-foreground/10 bg-white p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">
            Stickers Anttova
          </p>
          <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-7">
            {CHAT_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                title={sticker.label}
                disabled={disabled || sending}
                onClick={() => handleSticker(sticker.id)}
                className="flex aspect-square items-center justify-center rounded-xl border border-foreground/8 bg-muted/30 p-1 transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
              >
                <Image
                  src={sticker.src}
                  alt={sticker.label}
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 p-4"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,video/*,.heic,.heif"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => setShowStickers((v) => !v)}
          disabled={disabled || sending}
          className={`rounded-full border px-3 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50 ${
            showStickers
              ? "border-primary bg-primary/10 text-primary"
              : "border-foreground/15"
          }`}
          title="Stickers"
        >
          😊
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || sending}
          className="rounded-full border border-foreground/15 px-3 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
          title="Adjuntar foto o archivo"
        >
          📎
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Escribe un mensaje…"
          rows={1}
          disabled={disabled || sending}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-foreground/15 px-4 py-2.5 outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || !text.trim()}
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:scale-105 disabled:opacity-50"
        >
          {sending ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
