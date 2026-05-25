import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  boolean,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { conversationsTable } from "./conversation.schema";

export const tasksTable = pgTable(
  "tasks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id").references(
      () => conversationsTable.id,
      { onDelete: "cascade" }
    ),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("todo"), // todo, in_progress, completed
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdById: integer("created_by_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    assignedToId: integer("assigned_to_id").references(() => usersTable.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("tasks_conversation_idx").on(table.conversationId),
    index("tasks_assigned_to_idx").on(table.assignedToId),
    index("tasks_status_idx").on(table.status),
    index("tasks_created_by_idx").on(table.createdById)
  ]
);

export const taskSubtasksTable = pgTable(
  "task_subtasks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [index("task_subtasks_task_idx").on(table.taskId)]
);

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  conversation: one(conversationsTable, {
    fields: [tasksTable.conversationId],
    references: [conversationsTable.id]
  }),
  creator: one(usersTable, {
    fields: [tasksTable.createdById],
    references: [usersTable.id],
    relationName: "task_creator"
  }),
  assignee: one(usersTable, {
    fields: [tasksTable.assignedToId],
    references: [usersTable.id],
    relationName: "task_assignee"
  }),
  subtasks: many(taskSubtasksTable)
}));

export const taskSubtasksRelations = relations(
  taskSubtasksTable,
  ({ one }) => ({
    task: one(tasksTable, {
      fields: [taskSubtasksTable.taskId],
      references: [tasksTable.id]
    })
  })
);

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type TaskSubtask = typeof taskSubtasksTable.$inferSelect;
export type NewTaskSubtask = typeof taskSubtasksTable.$inferInsert;
