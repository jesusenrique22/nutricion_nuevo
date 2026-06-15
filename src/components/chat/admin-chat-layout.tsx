import Link from "next/link";
import type {
  ChatPageData,
  ConversationListItem,
} from "@/server/actions/chat.actions";
import { ChatRoom } from "@/components/chat/chat-room";
import { GroupedConversationList } from "@/components/chat/grouped-conversation-list";

export function AdminChatLayout({
  conversations,
  chatData,
  conversationId,
}: {
  conversations: ConversationListItem[];
  chatData: ChatPageData | null;
  conversationId?: string;
}) {
  const activePatientId = conversationId
    ? conversations.find((c) => c.id === conversationId)?.patientId
    : undefined;

  const patientConsultationLinks =
    activePatientId && chatData
      ? conversations
          .filter((c) => c.patientId === activePatientId)
          .map((c) => ({
            conversationId: c.id,
            consultationCode: c.consultationCode,
            consultationLabel: c.consultationLabel,
            unread: c.unread,
          }))
      : [];

  const emptyState = (
    <div className="flex h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] items-center justify-center rounded-2xl border border-dashed border-foreground/20 bg-white text-sm text-foreground/50">
      Selecciona un paciente para ver la conversación.
    </div>
  );

  return (
    <>
      <div className="hidden items-stretch gap-6 lg:grid lg:grid-cols-[280px_1fr]">
        <GroupedConversationList
          conversations={conversations}
          activeId={conversationId}
        />
        {chatData ? (
          <ChatRoom
            key={chatData.conversationId}
            initialData={chatData}
            adminConsultationLinks={patientConsultationLinks}
          />
        ) : (
          emptyState
        )}
      </div>

      <div className="lg:hidden">
        {conversationId && chatData ? (
          <div className="flex min-h-0 flex-col">
            <Link
              href="/dashboard/chat"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-accent"
            >
              ← Volver a conversaciones
            </Link>
            <ChatRoom
              key={chatData.conversationId}
              initialData={chatData}
              adminConsultationLinks={patientConsultationLinks}
            />
          </div>
        ) : (
          <GroupedConversationList
            conversations={conversations}
            activeId={conversationId}
          />
        )}
      </div>
    </>
  );
}
