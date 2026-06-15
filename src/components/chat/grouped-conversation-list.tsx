"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ConversationListItem } from "@/server/actions/chat.actions";
import { groupConversationsByPatient } from "@/lib/chat-conversations-group";
import { CONSULTATION_CHAT_STYLES } from "@/lib/consultation-chat-styles";

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PatientAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
    >
      {initial}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ConversationRow({
  conversation,
  active,
  nested = false,
  showPatientName = false,
}: {
  conversation: ConversationListItem;
  active: boolean;
  nested?: boolean;
  showPatientName?: boolean;
}) {
  const style =
    CONSULTATION_CHAT_STYLES[conversation.consultationCode]?.pill ??
    CONSULTATION_CHAT_STYLES.NUT_01.pill;

  return (
    <Link
      href={`/dashboard/chat?conversation=${conversation.id}`}
      className={`block border-b border-foreground/5 transition last:border-0 hover:bg-muted/50 ${
        nested ? "pl-4 pr-4 py-2.5" : "px-4 py-3"
      } ${active ? "bg-primary/5" : ""}`}
    >
      <div className="flex items-start gap-3">
        {showPatientName ? (
          <PatientAvatar name={conversation.patientName} />
        ) : null}

        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {showPatientName ? (
              <>
                <span className="font-semibold">{conversation.patientName}</span>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style}`}
                >
                  {conversation.consultationLabel}
                </span>
              </>
            ) : (
              <>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style}`}
                >
                  {conversation.consultationLabel}
                </span>
                {nested ? (
                  <p className="mt-1 truncate text-[11px] font-medium text-foreground/45">
                    {conversation.patientName}
                  </p>
                ) : null}
              </>
            )}
            {conversation.lastMessage ? (
              <p className="mt-1.5 truncate text-xs text-foreground/50">
                {conversation.lastMessage}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-foreground/35">Sin mensajes aún</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {conversation.unread > 0 ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {conversation.unread}
              </span>
            ) : null}
            {conversation.lastMessageAt ? (
              <span className="text-[10px] text-foreground/40">
                {fmt(conversation.lastMessageAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GroupedConversationList({
  conversations,
  activeId,
  className = "",
}: {
  conversations: ConversationListItem[];
  activeId?: string;
  className?: string;
}) {
  const groups = useMemo(
    () => groupConversationsByPatient(conversations),
    [conversations],
  );

  const activePatientId = useMemo(
    () => conversations.find((c) => c.id === activeId)?.patientId,
    [conversations, activeId],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!activePatientId) return;
    setExpanded((prev) => {
      if (prev.has(activePatientId)) return prev;
      const next = new Set(prev);
      next.add(activePatientId);
      return next;
    });
  }, [activePatientId]);

  function togglePatient(patientId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  if (groups.length === 0) {
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
      <div className="shrink-0 border-b border-foreground/8 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
          Pacientes
        </p>
        <p className="mt-0.5 text-xs text-foreground/50">
          Cada tipo de consulta tiene su chat aparte.
        </p>
      </div>

      <div className="scrollbar-stable min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.map((group) => {
          const isOpen = expanded.has(group.patientId);
          const single = group.conversations.length === 1;
          const only = single ? group.conversations[0] : null;

          if (single && only) {
            return (
              <ConversationRow
                key={group.patientId}
                conversation={only}
                active={activeId === only.id}
                showPatientName
              />
            );
          }

          return (
            <div key={group.patientId} className="border-b border-foreground/5">
              <button
                type="button"
                onClick={() => togglePatient(group.patientId)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40 ${
                  activePatientId === group.patientId ? "bg-primary/[0.03]" : ""
                }`}
              >
                <Chevron open={isOpen} />
                <PatientAvatar name={group.patientName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-base font-semibold">
                      {group.patientName}
                    </span>
                    {group.totalUnread > 0 ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                        {group.totalUnread}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-foreground/45">
                    {group.conversations.length} chats ·{" "}
                    {group.conversations
                      .map((c) => c.consultationLabel)
                      .join(", ")}
                  </p>
                </div>
              </button>

              {isOpen
                ? group.conversations.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      active={activeId === conversation.id}
                      nested
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
