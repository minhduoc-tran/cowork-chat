import { pgTable, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";

export const friendRequestsTable = pgTable("friend_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, accepted, rejected, cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("friend_requests_sender_idx").on(table.senderId),
  index("friend_requests_receiver_idx").on(table.receiverId),
  index("friend_requests_status_idx").on(table.status),
  uniqueIndex("friend_requests_unique").on(table.senderId, table.receiverId),
]);

export const friendRequestsRelations = relations(friendRequestsTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [friendRequestsTable.senderId],
    references: [usersTable.id],
    relationName: "sender",
  }),
  receiver: one(usersTable, {
    fields: [friendRequestsTable.receiverId],
    references: [usersTable.id],
    relationName: "receiver",
  }),
}));

export const friendshipsTable = pgTable("friendships", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  friendId: integer("friend_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("friendships_user_idx").on(table.userId),
  index("friendships_friend_idx").on(table.friendId),
  uniqueIndex("friendships_unique").on(table.userId, table.friendId),
]);

export const friendshipsRelations = relations(friendshipsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [friendshipsTable.userId],
    references: [usersTable.id],
    relationName: "user",
  }),
  friend: one(usersTable, {
    fields: [friendshipsTable.friendId],
    references: [usersTable.id],
  }),
}));

export type FriendRequest = typeof friendRequestsTable.$inferSelect;
export type NewFriendRequest = typeof friendRequestsTable.$inferInsert;
export type Friendship = typeof friendshipsTable.$inferSelect;
export type NewFriendship = typeof friendshipsTable.$inferInsert;