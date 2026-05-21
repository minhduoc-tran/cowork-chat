import type { Conversation, ConversationMember, Message } from "../drizzle";
import type { FriendRequest } from "../drizzle/schemas/friend.schema";
import type {
  PresenceUpdatedPayload,
  TypingUpdatedPayload
} from "./presence.types";

export type FriendRequestReceivedPayload = {
  request: FriendRequest;
  sender: {
    id: number;
    email: string;
    displayName: string;
    avatar: string | null;
  };
};

export type FriendRequestAcceptedPayload = {
  requestId: number;
  participants: Array<{
    id: number;
    email: string;
    displayName: string;
    avatar: string | null;
  }>;
  acceptedAt: string;
};

export type ConversationCreatedPayload = {
  conversation: Conversation;
  members: ConversationMember[];
  systemMessage: Message;
};

export type ViewerScopedPresencePayload = {
  viewerUserId: number;
  payload: PresenceUpdatedPayload;
};

export type ConversationJoinedPayload = {
  conversationId: number;
};

export type { PresenceUpdatedPayload, TypingUpdatedPayload };

export type MessageReplyPreview = {
  id: number;
  content: string | null;
  senderId: number;
  senderName: string;
  createdAt: string;
};

export type MessageReceivedPayload = {
  conversation: Conversation;
  members: Array<{
    userId: number;
    displayName: string;
    email: string;
    avatar: string | null;
    isFriend: boolean;
  }>;
  message: Message;
  replyTo: MessageReplyPreview | null;
};

export type MessageReadPayload = {
  conversationId: number;
  userId: number;
  lastReadMessageId: number;
};

export type MessageUpdatedPayload = {
  message: Message;
  replyTo: MessageReplyPreview | null;
};

export type ConversationPinPayload = {
  conversationId: number;
  messageId: number;
  pinnedById: number;
  pinnedByName: string;
  pinnedAt: string;
  messagePreview: {
    id: number;
    content: string | null;
    senderId: number;
    senderName: string;
    createdAt: string;
  };
};

export type ConversationPinUpdatedPayload = {
  conversationId: number;
  pin: ConversationPinPayload | null;
};
