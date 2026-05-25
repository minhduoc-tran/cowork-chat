import { db } from "../drizzle";
import { tasksTable, taskSubtasksTable } from "../drizzle/schemas/task.schema";
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  isNull,
  isNotNull,
  or,
  ilike,
  SQL
} from "drizzle-orm";
import { ApiError } from "../utils/api-error";
import { conversationService } from "./conversation.service";
import { socketEmitter } from "../socket/socket-emitter";

async function getRecipientUserIds(
  conversationId: number | null,
  fallbackUserId: number
): Promise<number[]> {
  if (!conversationId) {
    return [fallbackUserId];
  }
  return conversationService.listActiveConversationMemberIds(conversationId);
}

async function getTaskWithRelations(taskId: number) {
  return db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId),
    with: {
      subtasks: true,
      creator: {
        columns: {
          id: true,
          displayName: true,
          avatar: true
        }
      },
      assignee: {
        columns: {
          id: true,
          displayName: true,
          avatar: true
        }
      }
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilters(queryParams: Record<string, any>) {
  const conditions: SQL[] = [];

  const addFieldFilters = (
    fieldName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableColumn: any,
    isNumeric = false
  ) => {
    if (queryParams[fieldName] !== undefined) {
      conditions.push(
        eq(
          tableColumn,
          isNumeric ? Number(queryParams[fieldName]) : queryParams[fieldName]
        )
      );
    }
    if (queryParams[`${fieldName}__not`] !== undefined) {
      conditions.push(
        ne(
          tableColumn,
          isNumeric
            ? Number(queryParams[`${fieldName}__not`])
            : queryParams[`${fieldName}__not`]
        )
      );
    }
    if (queryParams[`${fieldName}__isnull`] !== undefined) {
      if (queryParams[`${fieldName}__isnull`] === "true") {
        conditions.push(isNull(tableColumn));
      } else {
        conditions.push(isNotNull(tableColumn));
      }
    }
    if (queryParams[`${fieldName}__gt`] !== undefined) {
      conditions.push(
        gt(
          tableColumn,
          isNumeric
            ? Number(queryParams[`${fieldName}__gt`])
            : queryParams[`${fieldName}__gt`]
        )
      );
    }
    if (queryParams[`${fieldName}__gte`] !== undefined) {
      conditions.push(
        gte(
          tableColumn,
          isNumeric
            ? Number(queryParams[`${fieldName}__gte`])
            : queryParams[`${fieldName}__gte`]
        )
      );
    }
    if (queryParams[`${fieldName}__lt`] !== undefined) {
      conditions.push(
        lt(
          tableColumn,
          isNumeric
            ? Number(queryParams[`${fieldName}__lt`])
            : queryParams[`${fieldName}__lt`]
        )
      );
    }
    if (queryParams[`${fieldName}__lte`] !== undefined) {
      conditions.push(
        lte(
          tableColumn,
          isNumeric
            ? Number(queryParams[`${fieldName}__lte`])
            : queryParams[`${fieldName}__lte`]
        )
      );
    }
    if (queryParams[`${fieldName}__range`] !== undefined) {
      const parts = String(queryParams[`${fieldName}__range`]).split(",");
      if (parts.length === 2) {
        conditions.push(
          and(
            gte(tableColumn, isNumeric ? Number(parts[0]) : parts[0]),
            lte(tableColumn, isNumeric ? Number(parts[1]) : parts[1])
          )
        );
      }
    }
  };

  addFieldFilters("status", tasksTable.status);
  addFieldFilters("priority", tasksTable.priority);
  addFieldFilters("dueDate", tasksTable.dueDate);
  addFieldFilters("assignedToId", tasksTable.assignedToId, true);

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function listTasks(input: {
  userId: number;
  conversationId?: number;
  limit?: number;
  offset?: number;
  search?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryParams?: Record<string, any>;
}) {
  const searchVal = input.search ? `%${input.search}%` : undefined;
  const filterClause = input.queryParams
    ? buildFilters(input.queryParams)
    : undefined;

  if (input.conversationId) {
    // Group tasks: ensure member
    await conversationService.ensureActiveConversationMember(
      input.conversationId,
      input.userId
    );

    let whereClause: SQL | undefined = eq(
      tasksTable.conversationId,
      input.conversationId
    );

    if (searchVal) {
      whereClause = and(
        whereClause,
        or(
          ilike(tasksTable.title, searchVal),
          ilike(tasksTable.description, searchVal)
        )
      );
    }

    if (filterClause) {
      whereClause = and(whereClause, filterClause);
    }

    return db.query.tasksTable.findMany({
      where: whereClause,
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      limit: input.limit,
      offset: input.offset,
      with: {
        subtasks: true,
        creator: {
          columns: {
            id: true,
            displayName: true,
            avatar: true
          }
        },
        assignee: {
          columns: {
            id: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });
  } else {
    // Personal tasks: created by or assigned to current user, and conversationId is null
    let whereClause: SQL | undefined = and(
      isNull(tasksTable.conversationId),
      or(
        eq(tasksTable.createdById, input.userId),
        eq(tasksTable.assignedToId, input.userId)
      )
    );

    if (searchVal) {
      whereClause = and(
        whereClause,
        or(
          ilike(tasksTable.title, searchVal),
          ilike(tasksTable.description, searchVal)
        )
      );
    }

    if (filterClause) {
      whereClause = and(whereClause, filterClause);
    }

    return db.query.tasksTable.findMany({
      where: whereClause,
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      limit: input.limit,
      offset: input.offset,
      with: {
        subtasks: true,
        creator: {
          columns: {
            id: true,
            displayName: true,
            avatar: true
          }
        },
        assignee: {
          columns: {
            id: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });
  }
}

async function createTask(input: {
  title: string;
  description?: string;
  conversationId?: number;
  dueDate?: string;
  priority?: string;
  createdById: number;
  assignedToId?: number;
}) {
  if (input.conversationId) {
    await conversationService.ensureActiveConversationMember(
      input.conversationId,
      input.createdById
    );
  }

  const [inserted] = await db
    .insert(tasksTable)
    .values({
      title: input.title,
      description: input.description,
      conversationId: input.conversationId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority || "medium",
      createdById: input.createdById,
      assignedToId: input.assignedToId ?? null
    })
    .returning();

  const task = await getTaskWithRelations(inserted.id);
  if (!task) {
    throw ApiError.server("Failed to retrieve created task");
  }

  const userIds = await getRecipientUserIds(
    task.conversationId,
    task.createdById
  );
  socketEmitter.emitTaskCreated(task.conversationId, userIds, task);

  return task;
}

async function updateTask(
  taskId: number,
  userId: number,
  data: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    assignedToId: number | null;
  }>
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  } else {
    if (task.createdById !== userId && task.assignedToId !== userId) {
      throw ApiError.forbidden(
        "You do not have permission to update this task"
      );
    }
  }

  const updateFields: Partial<typeof tasksTable.$inferInsert> = {
    updatedAt: new Date()
  };
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.description !== undefined)
    updateFields.description = data.description;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.priority !== undefined) updateFields.priority = data.priority;
  if (data.dueDate !== undefined)
    updateFields.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.assignedToId !== undefined)
    updateFields.assignedToId = data.assignedToId;

  await db
    .update(tasksTable)
    .set(updateFields)
    .where(eq(tasksTable.id, taskId));

  const updatedTask = await getTaskWithRelations(taskId);
  if (!updatedTask) {
    throw ApiError.server("Failed to retrieve updated task");
  }

  const userIds = await getRecipientUserIds(
    updatedTask.conversationId,
    updatedTask.createdById
  );
  socketEmitter.emitTaskUpdated(
    updatedTask.conversationId,
    userIds,
    updatedTask
  );

  return updatedTask;
}

async function deleteTask(taskId: number, userId: number) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  } else {
    if (task.createdById !== userId) {
      throw ApiError.forbidden("Only the creator can delete this task");
    }
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));

  const userIds = await getRecipientUserIds(
    task.conversationId,
    task.createdById
  );
  socketEmitter.emitTaskDeleted(task.conversationId, userIds, {
    taskId,
    conversationId: task.conversationId
  });

  return { success: true };
}

// Subtask Logic
async function createSubtask(taskId: number, userId: number, title: string) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  } else {
    if (task.createdById !== userId && task.assignedToId !== userId) {
      throw ApiError.forbidden("You do not have permission to add subtasks");
    }
  }

  await db.insert(taskSubtasksTable).values({
    taskId,
    title,
    isCompleted: false
  });

  const updatedTask = await getTaskWithRelations(taskId);
  if (!updatedTask) {
    throw ApiError.server("Failed to retrieve updated task");
  }

  const userIds = await getRecipientUserIds(
    updatedTask.conversationId,
    updatedTask.createdById
  );
  socketEmitter.emitTaskUpdated(
    updatedTask.conversationId,
    userIds,
    updatedTask
  );

  return updatedTask;
}

async function updateSubtask(
  taskId: number,
  subtaskId: number,
  userId: number,
  data: Partial<{
    title: string;
    isCompleted: boolean;
  }>
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  } else {
    if (task.createdById !== userId && task.assignedToId !== userId) {
      throw ApiError.forbidden("You do not have permission to edit subtasks");
    }
  }

  const subtask = await db.query.taskSubtasksTable.findFirst({
    where: and(
      eq(taskSubtasksTable.id, subtaskId),
      eq(taskSubtasksTable.taskId, taskId)
    )
  });

  if (!subtask) {
    throw ApiError.notFound("Subtask not found");
  }

  const updateFields: Partial<typeof taskSubtasksTable.$inferInsert> = {
    updatedAt: new Date()
  };
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.isCompleted !== undefined)
    updateFields.isCompleted = data.isCompleted;

  await db
    .update(taskSubtasksTable)
    .set(updateFields)
    .where(eq(taskSubtasksTable.id, subtaskId));

  const updatedTask = await getTaskWithRelations(taskId);
  if (!updatedTask) {
    throw ApiError.server("Failed to retrieve updated task");
  }

  const userIds = await getRecipientUserIds(
    updatedTask.conversationId,
    updatedTask.createdById
  );
  socketEmitter.emitTaskUpdated(
    updatedTask.conversationId,
    userIds,
    updatedTask
  );

  return updatedTask;
}

async function deleteSubtask(
  taskId: number,
  subtaskId: number,
  userId: number
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  } else {
    if (task.createdById !== userId && task.assignedToId !== userId) {
      throw ApiError.forbidden("You do not have permission to delete subtasks");
    }
  }

  const subtask = await db.query.taskSubtasksTable.findFirst({
    where: and(
      eq(taskSubtasksTable.id, subtaskId),
      eq(taskSubtasksTable.taskId, taskId)
    )
  });

  if (!subtask) {
    throw ApiError.notFound("Subtask not found");
  }

  await db.delete(taskSubtasksTable).where(eq(taskSubtasksTable.id, subtaskId));

  const updatedTask = await getTaskWithRelations(taskId);
  if (!updatedTask) {
    throw ApiError.server("Failed to retrieve updated task");
  }

  const userIds = await getRecipientUserIds(
    updatedTask.conversationId,
    updatedTask.createdById
  );
  socketEmitter.emitTaskUpdated(
    updatedTask.conversationId,
    userIds,
    updatedTask
  );

  return updatedTask;
}

export const taskService = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask
};
