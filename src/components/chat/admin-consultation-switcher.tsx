"use client";

import Link from "next/link";
import type { ConsultationChatCode } from "@/types/chat";
import { CONSULTATION_CHAT_STYLES } from "@/lib/consultation-chat-styles";

export interface ConsultationChatLink {
  conversationId: string;
  consultationCode: ConsultationChatCode;
  consultationLabel: string;
  unread: number;
}

export function AdminConsultationSwitcher({
  links,
  activeConversationId,
}: {
  links: ConsultationChatLink[];
  activeConversationId: string;
}) {
  if (links.length <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => {
        const active = link.conversationId === activeConversationId;
        const style =
          CONSULTATION_CHAT_STYLES[link.consultationCode]?.pill ??
          CONSULTATION_CHAT_STYLES.NUT_01.pill;

        return (
          <Link
            key={link.conversationId}
            href={`/dashboard/chat?conversation=${link.conversationId}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-primary bg-primary text-white shadow-sm"
                : `${style} hover:border-primary/30`
            }`}
          >
            {link.consultationLabel}
            {link.unread > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-accent text-white"
                }`}
              >
                {link.unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
