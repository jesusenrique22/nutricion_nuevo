"use client";

import { useRef, useState } from "react";

export function ChatInput({
  onSendText,
  onSendFile,
  disabled,
}: {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 items-end gap-2 border-t border-foreground/10 bg-white p-4"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,video/mp4"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || sending}
        className="rounded-full border border-foreground/15 px-3 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
        title="Adjuntar archivo"
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
  );
}
