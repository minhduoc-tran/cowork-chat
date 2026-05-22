import { eq, desc, and, isNull, lt, asc, max } from "drizzle-orm";
import {
  db,
  messagesTable,
  usersTable,
  conversationsTable,
  conversationMembersTable,
  conversationPinsTable
} from "../drizzle";
import type { Message } from "../drizzle/schemas/message.schema";
import { ApiError } from "../utils/api-error";
import { conversationService } from "./conversation.service";
import { extractFirstUrl, unfurlUrl } from "../utils/unfurl.util";
import { socketEmitter } from "../socket/socket-emitter";

const concurrentUnfurls = new Map<number, number>(); // userId -> count

async function runBackgroundUnfurl(
  messageId: number,
  senderId: number,
  conversationId: number,
  content: string,
  memberUserIds: number[],
  replyPreview: MessageReplyPreview | null
) {
  const url = extractFirstUrl(content);
  if (!url) return;

  const currentCount = concurrentUnfurls.get(senderId) ?? 0;
  if (currentCount >= 2) {
    return; // rate limit exceeded
  }

  concurrentUnfurls.set(senderId, currentCount + 1);

  try {
    const previewResult = await unfurlUrl(url);
    if (!previewResult) {
      return;
    }

    const [updatedMessage] = await db
      .update(messagesTable)
      .set({
        linkPreview: previewResult,
        updatedAt: new Date()
      })
      .where(eq(messagesTable.id, messageId))
      .returning();

    if (updatedMessage) {
      socketEmitter.emitMessageUpdated(conversationId, memberUserIds, {
        message: updatedMessage,
        replyTo: replyPreview
      });
    }
  } catch (error) {
    // Fail silently
  } finally {
    const finalCount = concurrentUnfurls.get(senderId) ?? 1;
    if (finalCount <= 1) {
      concurrentUnfurls.delete(senderId);
    } else {
      concurrentUnfurls.set(senderId, finalCount - 1);
    }
  }
}

export type ListConversationMessagesInput = {
  conversationId: number;
  userId: number;
  limit: number;
  before?: number;
};

export type SendConversationTextMessageInput = {
  conversationId: number;
  senderId: number;
  content: string;
  replyToId?: number;
};

export type SendDirectTextMessageInput = {
  senderId: number;
  targetUserId: number;
  content: string;
  replyToId?: number;
};

// Reply preview DTO - shared across socket and REST responses
export type MessageReplyPreview = {
  id: number;
  content: string | null;
  senderId: number;
  senderName: string;
  createdAt: string;
};

// Enriched message unit returned by send and history flows
export type MessageWithReplyPreview = {
  message: Message;
  replyTo: MessageReplyPreview | null;
};

// Validation result from validateReplyToId
type ValidatedReply = {
  replyToId: number;
  replyToMessage: Message;
  replyToSenderName: string;
};

/**
 * Load replied-to message with sender display name.
 * Returns null if replyToId is not provided.
 */
async function loadReplyPreview(
  replyToId: number | undefined
): Promise<MessageReplyPreview | null> {
  if (replyToId === undefined) return null;

  const replyMessage = await db.query.messagesTable.findFirst({
    where: eq(messagesTable.id, replyToId),
    with: { sender: true }
  });

  if (!replyMessage) return null;

  return {
    id: replyMessage.id,
    content: replyMessage.content,
    senderId: replyMessage.senderId,
    senderName: replyMessage.sender?.displayName ?? "Unknown",
    createdAt: replyMessage.createdAt.toISOString()
  };
}

/**
 * Validate that the replied-to message belongs to the expected conversation
 * and is not soft-deleted.
 */
async function validateReplyToId(
  replyToId: number,
  expectedConversationId: number
): Promise<ValidatedReply> {
  const replyMessage = await db.query.messagesTable.findFirst({
    where: eq(messagesTable.id, replyToId),
    with: { sender: true }
  });

  if (!replyMessage) {
    throw ApiError.badRequest("Message not found or cannot reply to it");
  }

  if (replyMessage.isDeleted) {
    throw ApiError.badRequest("Message not found or cannot reply to it");
  }

  if (replyMessage.conversationId !== expectedConversationId) {
    throw ApiError.badRequest("Message not found or cannot reply to it");
  }

  return {
    replyToId,
    replyToMessage: replyMessage,
    replyToSenderName: replyMessage.sender?.displayName ?? "Unknown"
  };
}

/**
 * Build an enriched message unit combining a message row with optional reply preview.
 */
function buildMessageWithReply(
  message: Message,
  replyPreview: MessageReplyPreview | null
): MessageWithReplyPreview {
  return { message, replyTo: replyPreview };
}

async function listConversationMessages(input: ListConversationMessagesInput) {
  await conversationService.ensureActiveConversationMember(
    input.conversationId,
    input.userId
  );

  const conditions = [eq(messagesTable.conversationId, input.conversationId)];
  if (input.before) {
    conditions.push(lt(messagesTable.id, input.before));
  }

  const messages = await db.query.messagesTable.findMany({
    where: and(...conditions),
    orderBy: desc(messagesTable.createdAt),
    limit: Math.min(Math.max(input.limit, 1), 50),
    with: {
      replyTo: {
        with: { sender: true }
      },
      sender: true
    }
  });

  const pins = await conversationService.getConversationPins(input.conversationId);

  return {
    messages: messages.map(msg =>
      buildMessageWithReply(
        msg,
        msg.replyTo
          ? {
              id: msg.replyTo.id,
              content: msg.replyTo.content,
              senderId: msg.replyTo.senderId,
              senderName: msg.replyTo.sender?.displayName ?? "Unknown",
              createdAt: msg.replyTo.createdAt.toISOString()
            }
          : null
      )
    ),
    pins
  };
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

  // Validate replyToId if provided
  let replyPreview: MessageReplyPreview | null = null;
  if (input.replyToId !== undefined) {
    const validated = await validateReplyToId(
      input.replyToId,
      input.conversationId
    );
    replyPreview = {
      id: validated.replyToMessage.id,
      content: validated.replyToMessage.content,
      senderId: validated.replyToMessage.senderId,
      senderName: validated.replyToSenderName,
      createdAt: validated.replyToMessage.createdAt.toISOString()
    };
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
      replyToId: input.replyToId,
      createdAt,
      updatedAt: createdAt
    })
    .returning();

  void runBackgroundUnfurl(
    message.id,
    input.senderId,
    input.conversationId,
    input.content,
    members.map(m => m.userId),
    replyPreview
  );

  return {
    conversation,
    members,
    message,
    replyTo: replyPreview
  };
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

  // Validate replyToId if provided - must belong to the resolved conversation
  let replyPreview: MessageReplyPreview | null = null;
  if (input.replyToId !== undefined) {
    const validated = await validateReplyToId(input.replyToId, conversation.id);
    replyPreview = {
      id: validated.replyToMessage.id,
      content: validated.replyToMessage.content,
      senderId: validated.replyToMessage.senderId,
      senderName: validated.replyToSenderName,
      createdAt: validated.replyToMessage.createdAt.toISOString()
    };
  }

  const createdAt = new Date();

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId: conversation.id,
      senderId: input.senderId,
      type: "text",
      content: input.content,
      replyToId: input.replyToId,
      createdAt,
      updatedAt: createdAt
    })
    .returning();

  void runBackgroundUnfurl(
    message.id,
    input.senderId,
    conversation.id,
    input.content,
    members.map(m => m.userId),
    replyPreview
  );

  return { conversation, members, message, replyTo: replyPreview };
}

async function deleteMessage(messageId: number, userId: number) {
  const message = await db.query.messagesTable.findFirst({
    where: eq(messagesTable.id, messageId)
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  if (message.senderId !== userId) {
    throw ApiError.forbidden("You cannot delete this message");
  }

  await db
    .update(messagesTable)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(messagesTable.id, messageId));

  const pin = await db.query.conversationPinsTable.findFirst({
    where: and(
      eq(conversationPinsTable.conversationId, message.conversationId),
      eq(conversationPinsTable.messageId, messageId)
    )
  });

  if (pin) {
    // Only delete the affected pin row (not all pins for this conversation)
    await db
      .delete(conversationPinsTable)
      .where(
        and(
          eq(conversationPinsTable.conversationId, message.conversationId),
          eq(conversationPinsTable.messageId, messageId)
        )
      );

    // Reindex remaining pins to keep pinOrder contiguous
    const remaining = await db
      .select({
        id: conversationPinsTable.id,
        pinOrder: conversationPinsTable.pinOrder
      })
      .from(conversationPinsTable)
      .where(eq(conversationPinsTable.conversationId, message.conversationId))
      .orderBy(asc(conversationPinsTable.pinOrder));

    for (let i = 0; i < remaining.length; i++) {
      const newOrder = i + 1;
      if (remaining[i].pinOrder !== newOrder) {
        await db
          .update(conversationPinsTable)
          .set({ pinOrder: newOrder })
          .where(eq(conversationPinsTable.id, remaining[i].id));
      }
    }

    const activeMembers = await db
      .select({ userId: conversationMembersTable.userId })
      .from(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.conversationId, message.conversationId),
          isNull(conversationMembersTable.leftAt)
        )
      );

    const memberIds = activeMembers.map(m => m.userId);
    const updatedPins = await conversationService.getConversationPins(message.conversationId);
    socketEmitter.emitConversationPinUpdated(
      message.conversationId,
      memberIds,
      updatedPins
    );
  }
}

export const messageService = {
  listConversationMessages,
  sendConversationTextMessage,
  sendDirectTextMessage,
  deleteMessage
};
