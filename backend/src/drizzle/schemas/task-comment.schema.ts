import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { tasksTable } from "./task.schema";

export const taskCommentsTable = pgTable(
  "task_comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    content: text("content").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("task_comments_task_idx").on(table.taskId),
    index("task_comments_author_idx").on(table.authorId),
    index("task_comments_parent_idx").on(table.parentId),
    index("task_comments_created_idx").on(table.createdAt)
  ]
);

export const taskCommentsRelations = relations(
  taskCommentsTable,
  ({ one, many }) => ({
    task: one(tasksTable, {
      fields: [taskCommentsTable.taskId],
      references: [tasksTable.id]
    }),
    author: one(usersTable, {
      fields: [taskCommentsTable.authorId],
      references: [usersTable.id],
      relationName: "comment_author"
    }),
    parent: one(taskCommentsTable, {
      fields: [taskCommentsTable.parentId],
      references: [taskCommentsTable.id],
      relationName: "comment_replies"
    }),
    replies: many(taskCommentsTable, { relationName: "comment_replies" })
  })
);

export type TaskComment = typeof taskCommentsTable.$inferSelect;
export type NewTaskComment = typeof taskCommentsTable.$inferInsert;