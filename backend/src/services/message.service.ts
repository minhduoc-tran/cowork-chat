import { eq, desc, and, isNull } from "drizzle-orm";
import {
  db,
  messagesTable,
  usersTable,
  conversationsTable,
  conversationMembersTable
} from "../drizzle";
import { ApiError } from "../utils/api-error";
import { conversationService } from "./conversation.service";

export type ListConversationMessagesInput = {
  conversationId: number;
  userId: number;
  limit: number;
};

export type SendConversationTextMessageInput = {
  conversationId: number;
  senderId: number;
  content: string;
};

export type SendDirectTextMessageInput = {
  senderId: number;
  targetUserId: number;
  content: string;
};

async function listConversationMessages(input: ListConversationMessagesInput) {
  await conversationService.ensureActiveConversationMember(
    input.conversationId,
    input.userId
  );

  return db.query.messagesTable.findMany({
    where: eq(messagesTable.conversationId, input.conversationId),
    orderBy: desc(messagesTable.createdAt),
    limit: Math.min(Math.max(input.limit, 1), 50)
  });
}

async function sendConversationTextMessage(
  input: SendConversationTextMessageInput
) {
  await conversationService.ensureActiveConversationMember(
    input.conversationId,
    input.senderId
  );

  const conversation = await db.query.conversationsTable.findFirst({
    where: eq(conversationsTable.id, input.conversationId)
  });

  if (!conversation) {
    throw ApiError.notFound("Conversation not found");
  }

  const members = await db.query.conversationMembersTable.findMany({
    where: and(
      eq(conversationMembersTable.conversationId, input.conversationId),
      isNull(conversationMembersTable.leftAt)
    )
  });

  const createdAt = new Date();

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: "text",
      content: input.content,
      createdAt,
      updatedAt: createdAt
    })
    .returning();

  return { conversation, members, message };
}

async function sendDirectTextMessage(input: SendDirectTextMessageInput) {
  const targetUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, input.targetUserId)
  });

  if (!targetUser) {
    throw ApiError.notFound("Target user not found");
  }

  if (targetUser.id === input.senderId) {
    throw ApiError.badRequest("Cannot start a chat with yourself");
  }

  const existing = await conversationService.findDirectConversationBetweenUsers(
    input.senderId,
    input.targetUserId
  );

  const { conversation, members } =
    existing ??
    (await conversationService.createDirectConversation(
      input.senderId,
      input.targetUserId
    ));

  const createdAt = new Date();

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId: conversation.id,
      senderId: input.senderId,
      type: "text",
      content: input.content,
      createdAt,
      updatedAt: createdAt
    })
    .returning();

  return { conversation, members, message };
}

export const messageService = {
  listConversationMessages,
  sendConversationTextMessage,
  sendDirectTextMessage
};
