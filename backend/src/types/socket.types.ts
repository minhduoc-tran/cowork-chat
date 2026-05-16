import type { Conversation, ConversationMember, Message } from "../drizzle";
import type { FriendRequest } from "../drizzle/schemas/friend.schema";

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
