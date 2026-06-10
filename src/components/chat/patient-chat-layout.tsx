"use client";

import Link from "next/link";
import type {
  ChatPageData,
  PatientChatTab,
} from "@/server/actions/chat.actions";
import { ChatRoom } from "@/components/chat/chat-room";

function tabHref(code: string) {
  return `/dashboard/chat?type=${code}`;
}

function LockedChatPanel({
  chatData,
}: {
  chatData: ChatPageData;
}) {
  return (
    <div className="flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/20 bg-white p-8 text-center">
      <div className="text-4xl opacity-40">🔒</div>
      <h2 className="mt-4 text-lg font-bold">
        Chat de {chatData.consultationLabel} bloqueado
      </h2>
      <p className="mt-2 max-w-md text-sm text-foreground/60">
        {chatData.unlockHint}
      </p>
      <Link
        href="/dashboard/patient/appointments"
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
      >
        Ir a mis citas
      </Link>
    </div>
  );
}

export function PatientChatLayout({
  chatData,
  activeType,
}: {
  chatData: ChatPageData;
  activeType: string;
}) {
  const tabs = chatData.patientChatTabs ?? [];

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab: PatientChatTab) => {
          const active = tab.consultationCode === activeType;
          const baseClass =
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition";

          if (!tab.enabled) {
            return (
              <span
                key={tab.consultationCode}
                title={tab.unlockHint}
                className={`${baseClass} cursor-not-allowed border-foreground/10 bg-muted/40 text-foreground/40`}
              >
                🔒 {tab.consultationLabel}
              </span>
            );
          }

          return (
            <Link
              key={tab.consultationCode}
              href={tabHref(tab.consultationCode)}
              className={`${baseClass} ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-foreground/15 bg-white text-foreground/70 hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              {tab.consultationLabel}
              {tab.unread > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    active ? "bg-white/20 text-white" : "bg-accent text-white"
                  }`}
                >
                  {tab.unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {chatData.chatEnabled && chatData.conversationId ? (
        <ChatRoom key={chatData.conversationId} initialData={chatData} />
      ) : (
        <LockedChatPanel chatData={chatData} />
      )}
    </div>
  );
}
