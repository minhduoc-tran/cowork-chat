import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { messagesTable } from "./message.schema";

export const conversationsTable = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: varchar("type", { length: 20 }).notNull(), // direct, group
  name: varchar("name", { length: 100 }), // group name only, null for direct
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const conversationsRelations = relations(
  conversationsTable,
  ({ many }) => ({
    members: many(conversationMembersTable),
    messages: many(messagesTable),
    pins: many(conversationPinsTable),
    tags: many(conversationTagsTable)
  })
);

export const conversationTagsTable = pgTable(
  "conversation_tags",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(), // hex color e.g., #FF5733
    icon: varchar("icon", { length: 50 }), // emoji or icon identifier
    createdById: integer("created_by_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("conversation_tags_conversation_idx").on(table.conversationId),
    unique("conversation_tags_conv_name_uidx").on(
      table.conversationId,
      table.name
    )
  ]
);

export const conversationTagsRelations = relations(
  conversationTagsTable,
  ({ one }) => ({
    conversation: one(conversationsTable, {
      fields: [conversationTagsTable.conversationId],
      references: [conversationsTable.id]
    }),
    creator: one(usersTable, {
      fields: [conversationTagsTable.createdById],
      references: [usersTable.id]
    })
  })
);

export const conversationMembersTable = pgTable(
  "conversation_members",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"), // owner, admin, member
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }), // null if still active
    lastReadMessageId: integer("last_read_message_id") // for read receipts
  },
  table => [
    index("conversation_members_conversation_idx").on(table.conversationId),
    index("conversation_members_user_idx").on(table.userId),
    index("conversation_members_conversation_user_idx").on(
      table.conversationId,
      table.userId
    )
  ]
);

export const conversationMembersRelations = relations(
  conversationMembersTable,
  ({ one }) => ({
    conversation: one(conversationsTable, {
      fields: [conversationMembersTable.conversationId],
      references: [conversationsTable.id]
    }),
    user: one(usersTable, {
      fields: [conversationMembersTable.userId],
      references: [usersTable.id]
    })
  })
);

export const conversationPinsTable = pgTable(
  "conversation_pins",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    pinnedById: integer("pinned_by_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    pinOrder: integer("pin_order").notNull().default(1),
    pinnedAt: timestamp("pinned_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("conversation_pins_conversation_idx").on(table.conversationId),
    index("conversation_pins_message_idx").on(table.messageId),
    index("conversation_pins_conversation_order_idx").on(
      table.conversationId,
      table.pinOrder
    ),
    unique("conversation_pins_conversation_message_uidx").on(
      table.conversationId,
      table.messageId
    )
  ]
);

export const conversationPinsRelations = relations(
  conversationPinsTable,
  ({ one }) => ({
    conversation: one(conversationsTable, {
      fields: [conversationPinsTable.conversationId],
      references: [conversationsTable.id]
    }),
    message: one(messagesTable, {
      fields: [conversationPinsTable.messageId],
      references: [messagesTable.id]
    }),
    pinnedBy: one(usersTable, {
      fields: [conversationPinsTable.pinnedById],
      references: [usersTable.id]
    })
  })
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;
export type ConversationMember = typeof conversationMembersTable.$inferSelect;
export type NewConversationMember =
  typeof conversationMembersTable.$inferInsert;
export type ConversationPin = typeof conversationPinsTable.$inferSelect;
export type NewConversationPin = typeof conversationPinsTable.$inferInsert;
export type ConversationTag = typeof conversationTagsTable.$inferSelect;
export type NewConversationTag = typeof conversationTagsTable.$inferInsert;
