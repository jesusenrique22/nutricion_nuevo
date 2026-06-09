import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getAdminConversations,
  getChatPageData,
} from "@/server/actions/chat.actions";
import { AdminChatLayout } from "@/components/chat/admin-chat-layout";
import { ChatRoom } from "@/components/chat/chat-room";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { conversation: conversationId } = await searchParams;

  if (session.user.role === "ADMIN") {
    const conversations = await getAdminConversations();
    const chatData = conversationId
      ? await getChatPageData(conversationId)
      : null;

    return (
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">
          Conversaciones con tus pacientes.
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

  const chatData = await getChatPageData();
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
        Conversa con tu nutricionista en tiempo real.
      </p>
      <div className="mt-6">
        <ChatRoom initialData={chatData} />
      </div>
    </div>
  );
}
