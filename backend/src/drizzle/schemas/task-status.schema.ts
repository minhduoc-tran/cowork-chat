import {
  pgTable,
  varchar,
  integer,
  timestamp,
  real,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { conversationsTable } from "./conversation.schema";

export const taskStatusesTable = pgTable(
  "task_statuses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id").references(
      () => conversationsTable.id,
      { onDelete: "cascade" }
    ),
    key: varchar("key", { length: 50 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("gray"),
    position: real("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("task_statuses_conversation_idx").on(table.conversationId),
    unique("task_statuses_conv_key_uidx").on(table.conversationId, table.key)
  ]
);

export const taskStatusesRelations = relations(taskStatusesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [taskStatusesTable.conversationId],
    references: [conversationsTable.id]
  })
}));

export type TaskStatus = typeof taskStatusesTable.$inferSelect;
export type NewTaskStatus = typeof taskStatusesTable.$inferInsert;
