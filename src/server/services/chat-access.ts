import { ObjectId } from "mongodb";
import { getMongoDb, Collections } from "@/server/db/mongo";
import type { ConversationDoc } from "@/types/chat";

export async function assertConversationAccess(
  conversationId: string,
  userId: string,
  userRole: "ADMIN" | "PATIENT",
): Promise<ConversationDoc | null> {
  const db = await getMongoDb();
  const conv = await db
    .collection<ConversationDoc>(Collections.conversations)
    .findOne({ _id: new ObjectId(conversationId) });

  if (!conv) return null;

  if (userRole === "ADMIN") {
    if (!conv.participants.includes(userId)) {
      await db.collection<ConversationDoc>(Collections.conversations).updateOne(
        { _id: conv._id },
        {
          $addToSet: { participants: userId },
          $set: { [`unreadCount.${userId}`]: conv.unreadCount[userId] ?? 0 },
        },
      );
      conv.participants.push(userId);
      conv.unreadCount[userId] = conv.unreadCount[userId] ?? 0;
    }
    return conv;
  }

  if (!conv.participants.includes(userId)) return null;
  return conv;
}
