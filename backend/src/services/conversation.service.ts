import { and, eq, inArray, isNull, desc } from "drizzle-orm";
import {
  conversationMembersTable,
  conversationsTable,
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

  const conversations = memberships.map(m => ({
    conversation: m.conversation,
    members:
      membersByConversation.get(m.conversation.id)?.map(r => ({
        ...r.member,
        displayName: r.user.displayName,
        avatar: r.user.avatar,
        isOnline: r.user.isOnline
      })) ?? [],
    lastMessage:
      lastMessageByConversation.get(m.conversation.id)?.message ?? null
  }));

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

export const conversationService = {
  createGroupConversation,
  findDirectConversationBetweenUsers,
  createDirectConversation,
  ensureActiveConversationMember,
  listUserConversations,
  markConversationAsRead
};
