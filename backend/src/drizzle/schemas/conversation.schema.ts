import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { messagesTable } from "./message.schema";

export const conversationsTable = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: varchar("type", { length: 20 }).notNull(), // direct, group
  name: varchar("name", { length: 100 }), // group name only, null for direct
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationsRelations = relations(conversationsTable, ({ many }) => ({
  members: many(conversationMembersTable),
  messages: many(messagesTable),
}));

export const conversationMembersTable = pgTable("conversation_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp("left_at", { withTimezone: true }), // null if still active
  lastReadMessageId: integer("last_read_message_id"), // for read receipts
}, (table) => [
  index("conversation_members_conversation_idx").on(table.conversationId),
  index("conversation_members_user_idx").on(table.userId),
  index("conversation_members_conversation_user_idx").on(table.conversationId, table.userId),
]);

export const conversationMembersRelations = relations(conversationMembersTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [conversationMembersTable.conversationId],
    references: [conversationsTable.id],
  }),
  user: one(usersTable, {
    fields: [conversationMembersTable.userId],
    references: [usersTable.id],
  }),
}));

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;
export type ConversationMember = typeof conversationMembersTable.$inferSelect;
export type NewConversationMember = typeof conversationMembersTable.$inferInsert;