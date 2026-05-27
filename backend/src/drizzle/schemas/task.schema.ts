import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  boolean,
  index,
  real,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import {
  conversationsTable,
  conversationTagsTable
} from "./conversation.schema";
import { taskCommentsTable } from "./task-comment.schema";

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
    estimatedValue: integer("estimated_value"),
    estimatedUnit: varchar("estimated_unit", { length: 20 }),
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
  subtasks: many(taskSubtasksTable),
  members: many(taskMembersTable),
  tags: many(taskTagsTable),
  comments: many(taskCommentsTable)
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

export const taskMembersTable = pgTable(
  "task_members",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // owner, assignee, watcher
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("task_members_task_idx").on(table.taskId),
    index("task_members_user_idx").on(table.userId),
    unique("task_members_task_user_uidx").on(table.taskId, table.userId)
  ]
);

export const taskTagsTable = pgTable(
  "task_tags",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => conversationTagsTable.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  table => [
    index("task_tags_task_idx").on(table.taskId),
    index("task_tags_tag_idx").on(table.tagId),
    unique("task_tags_task_tag_uidx").on(table.taskId, table.tagId)
  ]
);

export const taskMembersRelations = relations(taskMembersTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [taskMembersTable.taskId],
    references: [tasksTable.id]
  }),
  user: one(usersTable, {
    fields: [taskMembersTable.userId],
    references: [usersTable.id]
  })
}));

export const taskTagsRelations = relations(taskTagsTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [taskTagsTable.taskId],
    references: [tasksTable.id]
  }),
  tag: one(conversationTagsTable, {
    fields: [taskTagsTable.tagId],
    references: [conversationTagsTable.id]
  })
}));

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type TaskSubtask = typeof taskSubtasksTable.$inferSelect;
export type NewTaskSubtask = typeof taskSubtasksTable.$inferInsert;
export type TaskMember = typeof taskMembersTable.$inferSelect;
export type NewTaskMember = typeof taskMembersTable.$inferInsert;
export type TaskTag = typeof taskTagsTable.$inferSelect;
export type NewTaskTag = typeof taskTagsTable.$inferInsert;
