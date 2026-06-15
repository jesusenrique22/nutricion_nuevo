import type { ConversationListItem } from "@/server/actions/chat.actions";

export interface PatientConversationGroup {
  patientId: string;
  patientName: string;
  totalUnread: number;
  lastMessageAt: string | null;
  conversations: ConversationListItem[];
}

export function groupConversationsByPatient(
  conversations: ConversationListItem[],
): PatientConversationGroup[] {
  const byPatient = new Map<string, ConversationListItem[]>();

  for (const conversation of conversations) {
    const list = byPatient.get(conversation.patientId) ?? [];
    list.push(conversation);
    byPatient.set(conversation.patientId, list);
  }

  const groups: PatientConversationGroup[] = [];

  for (const [patientId, items] of byPatient) {
    const sorted = [...items].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    groups.push({
      patientId,
      patientName: sorted[0]?.patientName ?? "Paciente",
      totalUnread: sorted.reduce((sum, c) => sum + c.unread, 0),
      lastMessageAt: sorted[0]?.lastMessageAt ?? null,
      conversations: sorted,
    });
  }

  return groups.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}
