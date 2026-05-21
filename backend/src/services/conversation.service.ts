import { and, eq, inArray, isNull, desc, aliasedTable } from "drizzle-orm";
import {
  conversationMembersTable,
  conversationsTable,
  conversationPinsTable,
  db,
  friendshipsTable,
  messagesTable,
  usersTable
} from "../drizzle";
import { ApiError } from "../utils/api-error";
import { socketEmitter } from "../socket/socket-emitter";

function normalizeMemberIds(creatorId: number, memberIds: number[]) {
  return [...new Set(memberIds)].filter(memberId => memberId !== creatorId);
}

async function findDirectConversationBetweenUsers(
  userAId: number,
  userBId: number
) {
  const directMemberships = await db
    .select({
      conversation: conversationsTable,
      member: conversationMembersTable
    })
    .from(conversationMembersTable)
    .innerJoin(
      conversationsTable,
      eq(conversationMembersTable.conversationId, conversationsTable.id)
    )
    .where(
      and(
        eq(conversationsTable.type, "direct"),
        isNull(conversationMembersTable.leftAt),
        inArray(conversationMembersTable.userId, [userAId, userBId])
      )
    );

  const grouped = new Map<number, typeof directMemberships>();
  directMemberships.forEach(row => {
    const existing = grouped.get(row.conversation.id) ?? [];
    existing.push(row);
    grouped.set(row.conversation.id, existing);
  });

  const match = [...grouped.values()].find(rows => {
    const ids = rows.map(row => row.member.userId).sort((a, b) => a - b);
    return (
      ids.length === 2 &&
      ids[0] === Math.min(userAId, userBId) &&
      ids[1] === Math.max(userAId, userBId)
    );
  });

  if (!match) {
    return null;
  }

  return {
    conversation: match[0].conversation,
    members: match.map(row => row.member)
  };
}

async function createDirectConversation(userAId: number, userBId: number) {
  const createdAt = new Date();
  return db.transaction(async tx => {
    const [conversation] = await tx
      .insert(conversationsTable)
      .values({
        type: "direct",
        createdAt,
        updatedAt: createdAt
      })
      .returning();

    const members = await tx
      .insert(conversationMembersTable)
      .values([
        { conversationId: conversation.id, userId: userAId, role: "member" },
        { conversationId: conversation.id, userId: userBId, role: "member" }
      ])
      .returning();

    return { conversation, members };
  });
}

async function ensureActiveConversationMember(
  conversationId: number,
  userId: number
) {
  const member = await db.query.conversationMembersTable.findFirst({
    where: and(
      eq(conversationMembersTable.conversationId, conversationId),
      eq(conversationMembersTable.userId, userId),
      isNull(conversationMembersTable.leftAt)
    )
  });

  if (!member) {
    throw ApiError.forbidden("You are not a member of this conversation");
  }

  return member;
}

async function listActiveConversationMemberIds(conversationId: number) {
  const activeMembers = await db
    .select({ userId: conversationMembersTable.userId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        isNull(conversationMembersTable.leftAt)
      )
    );

  return activeMembers.map(member => member.userId);
}

async function listUserConversations(userId: number) {
  const memberships = await db
    .select({
      member: conversationMembersTable,
      conversation: conversationsTable
    })
    .from(conversationMembersTable)
    .innerJoin(
      conversationsTable,
      eq(conversationMembersTable.conversationId, conversationsTable.id)
    )
    .where(
      and(
        eq(conversationMembersTable.userId, userId),
        isNull(conversationMembersTable.leftAt)
      )
    );

  const conversationIds = memberships.map(m => m.conversation.id);

  if (conversationIds.length === 0) {
    return { conversations: [] };
  }

  const allMembers = await db
    .select({
      member: conversationMembersTable,
      conversation: conversationsTable,
      user: {
        displayName: usersTable.displayName,
        avatar: usersTable.avatar,
        isOnline: usersTable.isOnline
      }
    })
    .from(conversationMembersTable)
    .innerJoin(
      conversationsTable,
      eq(conversationMembersTable.conversationId, conversationsTable.id)
    )
    .innerJoin(usersTable, eq(conversationMembersTable.userId, usersTable.id))
    .where(
      and(
        inArray(conversationMembersTable.conversationId, conversationIds),
        isNull(conversationMembersTable.leftAt)
      )
    );

  const messages = await db
    .select({
      message: messagesTable,
      conversation: conversationsTable
    })
    .from(messagesTable)
    .innerJoin(
      conversationsTable,
      eq(messagesTable.conversationId, conversationsTable.id)
    )
    .where(inArray(messagesTable.conversationId, conversationIds))
    .orderBy(desc(messagesTable.createdAt));

  const membersByConversation = new Map<number, typeof allMembers>();
  allMembers.forEach(row => {
    const existing = membersByConversation.get(row.conversation.id) ?? [];
    existing.push(row);
    membersByConversation.set(row.conversation.id, existing);
  });

  const lastMessageByConversation = new Map<number, (typeof messages)[0]>();
  messages.forEach(row => {
    if (!lastMessageByConversation.has(row.conversation.id)) {
      lastMessageByConversation.set(row.conversation.id, row);
    }
  });

  const messageSenderUser = aliasedTable(usersTable, "message_sender_user");
  const pinnerUser = aliasedTable(usersTable, "pinner_user");

  const pins = await db
    .select({
      id: conversationPinsTable.id,
      conversationId: conversationPinsTable.conversationId,
      messageId: conversationPinsTable.messageId,
      pinnedById: conversationPinsTable.pinnedById,
      pinnedAt: conversationPinsTable.pinnedAt,
      pinnedByName: pinnerUser.displayName,
      messagePreview: {
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        senderName: messageSenderUser.displayName,
        createdAt: messagesTable.createdAt
      }
    })
    .from(conversationPinsTable)
    .innerJoin(
      messagesTable,
      eq(conversationPinsTable.messageId, messagesTable.id)
    )
    .innerJoin(pinnerUser, eq(conversationPinsTable.pinnedById, pinnerUser.id))
    .innerJoin(
      messageSenderUser,
      eq(messagesTable.senderId, messageSenderUser.id)
    )
    .where(inArray(conversationPinsTable.conversationId, conversationIds));

  const pinsByConversation = new Map<number, (typeof pins)[0]>();
  pins.forEach(row => {
    pinsByConversation.set(row.conversationId, row);
  });

  const conversations = memberships.map(m => {
    const pin = pinsByConversation.get(m.conversation.id);
    return {
      conversation: m.conversation,
      members:
        membersByConversation.get(m.conversation.id)?.map(r => ({
          ...r.member,
          displayName: r.user.displayName,
          avatar: r.user.avatar,
          isOnline: r.user.isOnline
        })) ?? [],
      lastMessage:
        lastMessageByConversation.get(m.conversation.id)?.message ?? null,
      pin: pin
        ? {
            conversationId: pin.conversationId,
            messageId: pin.messageId,
            pinnedById: pin.pinnedById,
            pinnedByName: pin.pinnedByName,
            pinnedAt: pin.pinnedAt.toISOString(),
            messagePreview: {
              id: pin.messagePreview.id,
              content: pin.messagePreview.content,
              senderId: pin.messagePreview.senderId,
              senderName: pin.messagePreview.senderName ?? "Unknown",
              createdAt: pin.messagePreview.createdAt.toISOString()
            }
          }
        : null
    };
  });

  return { conversations };
}

async function createGroupConversation(input: {
  creatorId: number;
  name: string;
  memberIds: number[];
}) {
  const groupName = input.name.trim();
  const normalizedMemberIds = normalizeMemberIds(
    input.creatorId,
    input.memberIds
  );

  if (!groupName) {
    throw ApiError.badRequest("Group name is required");
  }

  if (normalizedMemberIds.length < 1) {
    throw ApiError.badRequest(
      "A group must include at least one friend besides the creator"
    );
  }

  const acceptedFriends = await db.query.friendshipsTable.findMany({
    where: and(
      eq(friendshipsTable.userId, input.creatorId),
      inArray(friendshipsTable.friendId, normalizedMemberIds)
    )
  });

  if (acceptedFriends.length !== normalizedMemberIds.length) {
    throw ApiError.forbidden("Only accepted friends can be added to a group");
  }

  const createdAt = new Date();

  const result = await db.transaction(async tx => {
    const [conversation] = await tx
      .insert(conversationsTable)
      .values({
        type: "group",
        name: groupName,
        createdAt,
        updatedAt: createdAt
      })
      .returning();

    const members = await tx
      .insert(conversationMembersTable)
      .values([
        {
          conversationId: conversation.id,
          userId: input.creatorId,
          role: "owner"
        },
        ...normalizedMemberIds.map(userId => ({
          conversationId: conversation.id,
          userId,
          role: "member" as const
        }))
      ])
      .returning();

    const [systemMessage] = await tx
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        senderId: input.creatorId,
        type: "system",
        content: JSON.stringify({
          eventType: "group_created",
          actorId: input.creatorId,
          conversationId: conversation.id,
          memberIds: normalizedMemberIds,
          groupName
        }),
        createdAt,
        updatedAt: createdAt
      })
      .returning();

    return { conversation, members, systemMessage };
  });

  socketEmitter.emitConversationCreated(
    [input.creatorId, ...normalizedMemberIds],
    result
  );

  return result;
}

async function markConversationAsRead(conversationId: number, userId: number) {
  // Get the latest message id in this conversation
  const [latestMessage] = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.id))
    .limit(1);

  if (!latestMessage) return null;

  // Get current lastReadMessageId
  const member = await db.query.conversationMembersTable.findFirst({
    where: and(
      eq(conversationMembersTable.conversationId, conversationId),
      eq(conversationMembersTable.userId, userId),
      isNull(conversationMembersTable.leftAt)
    )
  });

  if (!member) return null;

  // Only update if there are new unread messages
  if (
    member.lastReadMessageId !== null &&
    member.lastReadMessageId >= latestMessage.id
  ) {
    return null;
  }

  await db
    .update(conversationMembersTable)
    .set({ lastReadMessageId: latestMessage.id })
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        eq(conversationMembersTable.userId, userId)
      )
    );

  return { conversationId, userId, lastReadMessageId: latestMessage.id };
}

async function getConversationPin(conversationId: number) {
  const pinnerUser = aliasedTable(usersTable, "pinner_user");
  const messageSenderUser = aliasedTable(usersTable, "message_sender_user");

  const [pinRow] = await db
    .select({
      conversationId: conversationPinsTable.conversationId,
      messageId: conversationPinsTable.messageId,
      pinnedById: conversationPinsTable.pinnedById,
      pinnedAt: conversationPinsTable.pinnedAt,
      pinnedByName: pinnerUser.displayName,
      messagePreview: {
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        senderName: messageSenderUser.displayName,
        createdAt: messagesTable.createdAt
      }
    })
    .from(conversationPinsTable)
    .innerJoin(
      messagesTable,
      eq(conversationPinsTable.messageId, messagesTable.id)
    )
    .innerJoin(pinnerUser, eq(conversationPinsTable.pinnedById, pinnerUser.id))
    .innerJoin(
      messageSenderUser,
      eq(messagesTable.senderId, messageSenderUser.id)
    )
    .where(eq(conversationPinsTable.conversationId, conversationId))
    .limit(1);

  if (!pinRow) {
    return null;
  }

  return {
    conversationId: pinRow.conversationId,
    messageId: pinRow.messageId,
    pinnedById: pinRow.pinnedById,
    pinnedByName: pinRow.pinnedByName,
    pinnedAt: pinRow.pinnedAt.toISOString(),
    messagePreview: {
      id: pinRow.messagePreview.id,
      content: pinRow.messagePreview.content,
      senderId: pinRow.messagePreview.senderId,
      senderName: pinRow.messagePreview.senderName ?? "Unknown",
      createdAt: pinRow.messagePreview.createdAt.toISOString()
    }
  };
}

async function pinConversationMessage(input: {
  conversationId: number;
  messageId: number;
  userId: number;
}) {
  const { conversationId, messageId, userId } = input;

  await ensureActiveConversationMember(conversationId, userId);

  const message = await db.query.messagesTable.findFirst({
    where: and(
      eq(messagesTable.id, messageId),
      eq(messagesTable.conversationId, conversationId)
    ),
    with: {
      sender: true
    }
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  if (message.isDeleted) {
    throw ApiError.badRequest("Cannot pin a deleted message");
  }

  const pinner = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId)
  });

  if (!pinner) {
    throw ApiError.notFound("User not found");
  }

  const pinnedAt = new Date();

  const [pinRow] = await db
    .insert(conversationPinsTable)
    .values({
      conversationId,
      messageId,
      pinnedById: userId,
      pinnedAt
    })
    .onConflictDoUpdate({
      target: conversationPinsTable.conversationId,
      set: {
        messageId,
        pinnedById: userId,
        pinnedAt
      }
    })
    .returning();

  const payload = {
    conversationId: pinRow.conversationId,
    messageId: pinRow.messageId,
    pinnedById: pinRow.pinnedById,
    pinnedByName: pinner.displayName,
    pinnedAt: pinRow.pinnedAt.toISOString(),
    messagePreview: {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender?.displayName ?? "Unknown",
      createdAt: message.createdAt.toISOString()
    }
  };

  const activeMembers = await db
    .select({ userId: conversationMembersTable.userId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        isNull(conversationMembersTable.leftAt)
      )
    );

  const memberIds = activeMembers.map(m => m.userId);

  socketEmitter.emitConversationPinUpdated(conversationId, memberIds, payload);

  return payload;
}

async function unpinConversationMessage(input: {
  conversationId: number;
  userId: number;
}) {
  const { conversationId, userId } = input;

  await ensureActiveConversationMember(conversationId, userId);

  await db
    .delete(conversationPinsTable)
    .where(eq(conversationPinsTable.conversationId, conversationId));

  const activeMembers = await db
    .select({ userId: conversationMembersTable.userId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        isNull(conversationMembersTable.leftAt)
      )
    );

  const memberIds = activeMembers.map(m => m.userId);

  socketEmitter.emitConversationPinUpdated(conversationId, memberIds, null);

  return null;
}

export const conversationService = {
  createGroupConversation,
  findDirectConversationBetweenUsers,
  createDirectConversation,
  ensureActiveConversationMember,
  listActiveConversationMemberIds,
  listUserConversations,
  markConversationAsRead,
  getConversationPin,
  pinConversationMessage,
  unpinConversationMessage
};
