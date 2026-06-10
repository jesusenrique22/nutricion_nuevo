"use client";

import Link from "next/link";
import type { ConversationListItem } from "@/server/actions/chat.actions";

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationList({
  conversations,
  activeId,
  className = "",
}: {
  conversations: ConversationListItem[];
  activeId?: string;
  className?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div
        className={`flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] items-center justify-center rounded-2xl border border-foreground/10 bg-white p-6 text-sm text-foreground/50 ${className}`}
      >
        Aún no hay conversaciones con pacientes.
      </div>
    );
  }

  return (
    <div
      className={`flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-white ${className}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/chat?conversation=${c.id}`}
          className={`block border-b border-foreground/5 px-4 py-3 transition last:border-0 hover:bg-muted/50 ${
            activeId === c.id ? "bg-primary/5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold">{c.patientName}</span>
              <span className="mt-0.5 block text-[11px] font-medium text-accent">
                {c.consultationLabel}
              </span>
            </div>
            {c.unread > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                {c.unread}
              </span>
            )}
          </div>
          {c.lastMessage && (
            <p className="mt-0.5 truncate text-xs text-foreground/50">
              {c.lastMessage}
            </p>
          )}
          {c.lastMessageAt && (
            <p className="mt-0.5 text-[10px] text-foreground/40">
              {fmt(c.lastMessageAt)}
            </p>
          )}
        </Link>
      ))}
      </div>
    </div>
  );
}
