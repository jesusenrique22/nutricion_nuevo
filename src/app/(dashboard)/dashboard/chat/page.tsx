import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MongoUnavailable } from "@/components/chat/mongo-unavailable";
import { AdminChatLayout } from "@/components/chat/admin-chat-layout";
import { PatientChatLayout } from "@/components/chat/patient-chat-layout";
import { isConsultationChatCode } from "@/lib/consultation-chat";
import { isMongoConnectionError } from "@/lib/mongo-errors";
import {
  getAdminConversations,
  getChatPageData,
} from "@/server/actions/chat.actions";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{
    conversation?: string;
    type?: string;
    appointment?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const { conversation: conversationId, type, appointment } = params;

  try {
    if (session.user.role === "ADMIN") {
      const conversations = await getAdminConversations();
      const chatData = conversationId
        ? await getChatPageData({ selectedConversationId: conversationId })
        : null;

      return (
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
          <p className="mt-2 text-sm text-foreground/60 sm:text-base">
            Pacientes agrupados por carpeta — cada tipo de consulta tiene su
            propio chat.
          </p>

          <div className="mt-6">
            <AdminChatLayout
              conversations={conversations}
              chatData={chatData}
              conversationId={conversationId}
            />
          </div>
        </div>
      );
    }

    const consultationCode = isConsultationChatCode(type) ? type : "NUT_01";
    const chatData = await getChatPageData({
      consultationCode,
      appointmentId: appointment,
    });

    if (!chatData) {
      return (
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
          <p className="mt-4 text-foreground/60">
            No se pudo iniciar el chat. Contacta a soporte.
          </p>
        </div>
      );
    }

    return (
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">
          Conversa con tu nutricionista según el tipo de consulta.
        </p>
        <div className="mt-6">
          <PatientChatLayout chatData={chatData} activeType={consultationCode} />
        </div>
      </div>
    );
  } catch (error) {
    if (!isMongoConnectionError(error)) throw error;

    return (
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">
          Conversa con tu nutricionista según el tipo de consulta.
        </p>
        <MongoUnavailable feature="chat" />
      </div>
    );
  }
}
