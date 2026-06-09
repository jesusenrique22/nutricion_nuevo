export interface IncomingMessageToast {
  id: string;
  senderName: string;
  preview: string;
  deepLink: string;
  conversationId: string;
}

export interface MessageIncomingPayload {
  senderName: string;
  preview: string;
  deepLink: string;
  conversationId: string;
}
