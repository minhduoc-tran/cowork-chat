export type PresenceStatus = "online" | "offline" | "active_in_conversation";

export type PresenceUpdatedPayload = {
  userId: number;
  isOnline: boolean;
  lastSeenAt: string | null;
  status: PresenceStatus;
  activeConversationId?: number;
};

export type PresenceSetActiveConversationPayload = {
  conversationId: number | null;
};

export type TypingSignalPayload = {
  conversationId: number;
};

export type TypingUpdatedPayload = {
  conversationId: number;
  userId: number;
  isTyping: boolean;
};
