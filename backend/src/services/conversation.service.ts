import { and, eq, inArray } from "drizzle-orm";
import {
  conversationMembersTable,
  conversationsTable,
  db,
  friendshipsTable,
  messagesTable
} from "../drizzle";
import { ApiError } from "../utils/api-error";
import { socketEmitter } from "../socket/socket-emitter";

function normalizeMemberIds(creatorId: number, memberIds: number[]) {
  return [...new Set(memberIds)].filter(memberId => memberId !== creatorId);
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

export const conversationService = {
  createGroupConversation
};
