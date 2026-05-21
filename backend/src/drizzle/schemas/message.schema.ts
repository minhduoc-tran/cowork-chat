import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  boolean,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { conversationsTable } from "./conversation.schema";
import { messageAttachmentsTable } from "./attachment.schema";
import { messageReactionsTable } from "./reaction.schema";

export interface LinkPreview {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export const messagesTable = pgTable(
  "messages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("text"), // text, image, file, system, reply
    content: text("content"), // text content or JSON for system messages
    replyToId: integer("reply_to_id"), // reference to replied message
    isEdited: boolean("is_edited").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    linkPreview: jsonb("link_preview").$type<LinkPreview>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_sender_idx").on(table.senderId),
    index("messages_created_idx").on(table.createdAt),
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    )
  ]
);

export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversationId],
    references: [conversationsTable.id]
  }),
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id]
  }),
  replyTo: one(messagesTable, {
    fields: [messagesTable.replyToId],
    references: [messagesTable.id],
    relationName: "replies"
  }),
  replies: many(messagesTable, { relationName: "replies" }),
  attachments: many(messageAttachmentsTable),
  reactions: many(messageReactionsTable)
}));

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
