import type {
  Conversation,
  ConversationMember,
  Message,
  MessageReaction
} from "../drizzle";
import type { FriendRequest } from "../drizzle/schemas/friend.schema";
import type {
  PresenceUpdatedPayload,
  TypingUpdatedPayload
} from "./presence.types";

export type MessageReactionWithUser = MessageReaction & {
  user: {
    id: number;
    displayName: string;
    avatar: string | null;
  };
};

export type MessageWithReactions = Message & {
  reactions?: MessageReactionWithUser[];
};

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
  message: MessageWithReactions;
  replyTo: MessageReplyPreview | null;
};

export type MessageReadPayload = {
  conversationId: number;
  userId: number;
  lastReadMessageId: number;
};

export type MessageUpdatedPayload = {
  message: MessageWithReactions;
  replyTo: MessageReplyPreview | null;
};

export type ConversationPinPayload = {
  conversationId: number;
  messageId: number;
  pinnedById: number;
  pinnedByName: string;
  pinnedAt: string;
  pinOrder: number;
  messagePreview: {
    id: number;
    content: string | null;
    senderId: number;
    senderName: string;
    createdAt: string;
  };
};

// Event: "pin:updated" — always carries full ordered list after any mutation
export type ConversationPinUpdatedPayload = {
  conversationId: number;
  pins: ConversationPinPayload[];
};

export type MessageDeletedPayload = {
  conversationId: number;
  messageId: number;
};
