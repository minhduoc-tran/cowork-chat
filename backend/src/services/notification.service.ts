import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../drizzle";
import {
  notificationsTable,
  type NotificationData,
  type NotificationType
} from "../drizzle/schemas/notification.schema";
import { usersTable } from "../drizzle/schemas/user.schema";
import { socketEmitter } from "../socket/socket-emitter";

const MAX_PREVIEW_LENGTH = 140;

function buildPreview(content: string | null | undefined): string | null {
  if (!content) return null;
  // Replace embedded task mention markup `[[task:id|title]]` with the title.
  const withoutMarkup = content.replace(/\[\[task:\d+\|([\s\S]*?)\]\]/g, "$1");
  const normalized = withoutMarkup.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= MAX_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}...`;
}

/**
 * Resolve @mentions inside a piece of text to actual user ids.
 *
 * Mentions are written as "@<displayName>" by the frontend mention-input.
 * We match against the provided candidate members (longest display name first
 * to avoid partial matches) and return the unique set of matched user ids.
 */
function parseMentionedUserIds(
  content: string,
  candidates: Array<{ userId: number; displayName: string }>
): number[] {
  if (!content || candidates.length === 0) return [];

  const sorted = [...candidates].sort(
    (a, b) => b.displayName.length - a.displayName.length
  );

  const escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const namesPattern = sorted
    .map(c => escapeRegex(c.displayName))
    .filter(Boolean)
    .join("|");

  if (!namesPattern) return [];

  const mentionRegex = new RegExp(`@(${namesPattern})`, "gi");
  const matchedIds = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    const matchedName = match[1].toLowerCase();
    const member = sorted.find(
      c => c.displayName.toLowerCase() === matchedName
    );
    if (member) {
      matchedIds.add(member.userId);
    }
  }

  return [...matchedIds];
}

async function createNotification(input: {
  userId: number;
  actorId: number | null;
  type: NotificationType;
  data?: NotificationData;
}) {
  // Never notify a user about their own action.
  if (input.actorId !== null && input.actorId === input.userId) {
    return null;
  }

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      data: input.data ?? null
    })
    .returning();

  // Hydrate actor info for the realtime payload so the client can render
  // it immediately without an extra fetch.
  let actor = null;
  if (notification.actorId) {
    actor =
      (await db.query.usersTable.findFirst({
        where: eq(usersTable.id, notification.actorId),
        columns: { id: true, displayName: true, avatar: true }
      })) ?? null;
  }

  const payload = { ...notification, actor };
  socketEmitter.emitNotificationCreated(input.userId, payload);

  return payload;
}

/**
 * Create the same notification for a batch of recipients.
 * Self-notifications are skipped inside createNotification.
 */
async function createNotificationsForUsers(input: {
  userIds: number[];
  actorId: number | null;
  type: NotificationType;
  data?: NotificationData;
}) {
  const uniqueUserIds = [...new Set(input.userIds)];
  await Promise.all(
    uniqueUserIds.map(userId =>
      createNotification({
        userId,
        actorId: input.actorId,
        type: input.type,
        data: input.data
      })
    )
  );
}

async function listNotifications(userId: number, limit = 30, offset = 0) {
  const notifications = await db.query.notificationsTable.findMany({
    where: eq(notificationsTable.userId, userId),
    orderBy: [desc(notificationsTable.createdAt)],
    limit,
    offset,
    with: {
      actor: {
        columns: { id: true, displayName: true, avatar: true }
      }
    }
  });

  const unreadCount = await getUnreadCount(userId);

  return { notifications, unreadCount };
}

async function getUnreadCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false)
      )
    );
  return rows.length;
}

async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId)
      )
    )
    .returning();
  return updated ?? null;
}

async function markManyAsRead(notificationIds: number[], userId: number) {
  if (notificationIds.length === 0) return { success: true };
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        inArray(notificationsTable.id, notificationIds)
      )
    );
  return { success: true };
}

async function markAllAsRead(userId: number) {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false)
      )
    );
  return { success: true };
}

export const notificationService = {
  parseMentionedUserIds,
  buildPreview,
  createNotification,
  createNotificationsForUsers,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markManyAsRead,
  markAllAsRead
};
