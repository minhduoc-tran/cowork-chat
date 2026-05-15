import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { messagesTable } from "./message.schema";
import { usersTable } from "./user.schema";

export const messageReactionsTable = pgTable(
  "message_reactions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 50 }).notNull(), // emoji character or code
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("message_reactions_message_idx").on(table.messageId),
    index("message_reactions_user_idx").on(table.userId),
    uniqueIndex("message_reactions_unique").on(
      table.messageId,
      table.userId,
      table.emoji
    )
  ]
);

export const messageReactionsRelations = relations(
  messageReactionsTable,
  ({ one }) => ({
    message: one(messagesTable, {
      fields: [messageReactionsTable.messageId],
      references: [messagesTable.id]
    }),
    user: one(usersTable, {
      fields: [messageReactionsTable.userId],
      references: [usersTable.id]
    })
  })
);

export type MessageReaction = typeof messageReactionsTable.$inferSelect;
export type NewMessageReaction = typeof messageReactionsTable.$inferInsert;
