import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";

/**
 * Notification types currently supported.
 * - task_assigned: someone assigned a task to the user
 * - task_mention: the user was @mentioned in a task comment
 * - message_mention: the user was @mentioned in a chat message
 */
export type NotificationType =
  | "task_assigned"
  | "task_mention"
  | "message_mention";

/**
 * Extra contextual data used by the frontend to build navigation links
 * and render previews without extra round-trips.
 */
export interface NotificationData {
  conversationId?: number | null;
  taskId?: number | null;
  messageId?: number | null;
  commentId?: number | null;
  taskTitle?: string | null;
  conversationName?: string | null;
  preview?: string | null;
}

export const notificationsTable = pgTable(
  "notifications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // The user who receives the notification
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // The user who triggered the notification (nullable for system events)
    actorId: integer("actor_id").references(() => usersTable.id, {
      onDelete: "set null"
    }),
    type: varchar("type", { length: 32 }).notNull(),
    data: jsonb("data").$type<NotificationData>(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_read_idx").on(table.userId, table.isRead),
    index("notifications_created_idx").on(table.createdAt)
  ]
);

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    // Only the actor relation is needed for queries (to show who triggered it).
    // userId is the recipient and is always the current user, so no relation
    // is defined for it to keep the relational query unambiguous.
    actor: one(usersTable, {
      fields: [notificationsTable.actorId],
      references: [usersTable.id]
    })
  })
);

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;
