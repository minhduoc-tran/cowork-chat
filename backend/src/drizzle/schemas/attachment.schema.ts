import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { messagesTable } from "./message.schema";

export const messageAttachmentsTable = pgTable("message_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // image, file
  url: varchar("url", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"), // bytes
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("message_attachments_message_idx").on(table.messageId),
]);

export const messageAttachmentsRelations = relations(messageAttachmentsTable, ({ one }) => ({
  message: one(messagesTable, {
    fields: [messageAttachmentsTable.messageId],
    references: [messagesTable.id],
  }),
}));

export type MessageAttachment = typeof messageAttachmentsTable.$inferSelect;
export type NewMessageAttachment = typeof messageAttachmentsTable.$inferInsert;