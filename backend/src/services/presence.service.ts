import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  conversationMembersTable,
  db,
  friendshipsTable,
  usersTable
} from "../drizzle";
import type {
  PresenceStatus,
  PresenceUpdatedPayload
} from "../types/presence.types";

type BuildPresencePayloadsForAudienceInput = {
  targetUserId: number;
  status: PresenceStatus;
  activeConversationId: number | null;
  audienceUserIds: number[];
};

async function setUserOnline(userId: number) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId)
  });

  if (!user || user.isOnline) {
    return false;
  }

  await db
    .update(usersTable)
    .set({ isOnline: true })
    .where(eq(usersTable.id, userId));

  return true;
}

async function setUserOffline(userId: number, lastSeenAt: Date) {
  await db
    .update(usersTable)
    .set({ isOnline: false, lastSeenAt })
    .where(eq(usersTable.id, userId));
}

async function listPresenceAudienceUserIds(userId: number) {
  const [friendRows, memberRows] = await Promise.all([
    db.query.friendshipsTable.findMany({
      where: eq(friendshipsTable.userId, userId)
    }),
    db.query.conversationMembersTable.findMany({
      where: and(
        eq(conversationMembersTable.userId, userId),
        isNull(conversationMembersTable.leftAt)
      )
    })
  ]);

  const conversationIds = memberRows.map(row => row.conversationId);
  const coMembers =
    conversationIds.length === 0
      ? []
      : await db.query.conversationMembersTable.findMany({
          where: and(
            inArray(conversationMembersTable.conversationId, conversationIds),
            isNull(conversationMembersTable.leftAt)
          )
        });

  return [
    ...new Set([
      ...friendRows.map(row => row.friendId),
      ...coMembers.map(row => row.userId)
    ])
  ].filter(id => id !== userId);
}

async function buildPresencePayloadsForAudience(
  input: BuildPresencePayloadsForAudienceInput
) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, input.targetUserId)
  });

  if (!user) {
    return [];
  }

  const visibleConversationMemberIds =
    input.activeConversationId === null
      ? new Set<number>()
      : new Set(
          (
            await db.query.conversationMembersTable.findMany({
              where: and(
                eq(
                  conversationMembersTable.conversationId,
                  input.activeConversationId
                ),
                isNull(conversationMembersTable.leftAt)
              )
            })
          ).map(row => row.userId)
        );

  return input.audienceUserIds.map(viewerUserId => {
    const canSeeConversationId =
      input.activeConversationId !== null &&
      visibleConversationMemberIds.has(viewerUserId);

    const payload: PresenceUpdatedPayload = {
      userId: input.targetUserId,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      status: input.status,
      ...(canSeeConversationId
        ? { activeConversationId: input.activeConversationId as number }
        : {})
    };

    return { viewerUserId, payload };
  });
}

export const presenceService = {
  setUserOnline,
  setUserOffline,
  listPresenceAudienceUserIds,
  buildPresencePayloadsForAudience
};
