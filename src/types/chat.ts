import { ObjectId } from "mongodb";

export type MessageType = "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "PDF";
export type FileContext = "CHAT" | "PROGRESS_PHOTO" | "DIET_PLAN" | "RESOURCE";
export type NotificationType =
  | "APPOINTMENT_REMINDER"
  | "NEW_MESSAGE"
  | "PAYMENT"
  | "SYSTEM";

export interface ConversationDoc {
  _id?: ObjectId;
  participants: string[]; // userIds de Postgres
  patientId: string;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentMeta {
  fileId: ObjectId;
  url: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

export interface MessageDoc {
  _id?: ObjectId;
  conversationId: ObjectId;
  senderId: string;
  type: MessageType;
  text: string | null;
  attachment?: AttachmentMeta | null;
  readBy: string[];
  createdAt: Date;
}

export interface FileDoc {
  _id?: ObjectId;
  ownerId: string;
  context: FileContext;
  relatedPatientId?: string;
  provider: "cloudinary" | "s3";
  publicId: string;
  url: string;
  secureUrl: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface NotificationDoc {
  _id?: ObjectId;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}
