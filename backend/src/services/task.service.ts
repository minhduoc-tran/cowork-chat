import { db } from "../drizzle";
import {
  tasksTable,
  taskSubtasksTable,
  taskMembersTable,
  taskTagsTable
} from "../drizzle/schemas/task.schema";
import { taskCommentsTable } from "../drizzle/schemas/task-comment.schema";
import { conversationTagsTable } from "../drizzle/schemas/conversation.schema";
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
  SQL,
  sql
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

// Permission Helper Functions
async function getTaskMemberRole(taskId: number, userId: number): Promise<"owner" | "assignee" | "watcher" | null> {
  const member = await db.query.taskMembersTable.findFirst({
    where: and(
      eq(taskMembersTable.taskId, taskId),
      eq(taskMembersTable.userId, userId)
    )
  });
  const role = member?.role;
  if (role === "owner" || role === "assignee" || role === "watcher") {
    return role;
  }
  return null;
}

async function checkTaskPermission(
  taskId: number,
  userId: number,
  requiredRole: "owner" | "assignee" | "watcher"
): Promise<boolean> {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) return false;

  const dbRole = await getTaskMemberRole(taskId, userId);
  
  let role: "owner" | "assignee" | "watcher" | null = dbRole;
  if (task.createdById === userId) {
    role = "owner";
  } else if (task.assignedToId === userId && (!role || role === "watcher")) {
    role = "assignee";
  }

  if (!role) return false;

  const roleOrder = { owner: 3, assignee: 2, watcher: 1 };
  return roleOrder[role] >= roleOrder[requiredRole];
}

async function requireTaskPermission(
  taskId: number,
  userId: number,
  requiredRole: "owner" | "assignee" | "watcher"
): Promise<void> {
  const hasPermission = await checkTaskPermission(taskId, userId, requiredRole);
  if (!hasPermission) {
    throw ApiError.forbidden("You do not have permission for this action");
  }
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
      },
      members: {
        with: {
          user: {
            columns: { id: true, displayName: true, avatar: true }
          }
        }
      },
      tags: {
        with: {
          tag: true
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
        const low = isNumeric ? Number(parts[0]) : parts[0];
        const high = isNumeric ? Number(parts[1]) : parts[1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(sql`${tableColumn} >= ${low} AND ${tableColumn} <= ${high}` as any);
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
        },
        members: {
          with: {
            user: {
              columns: { id: true, displayName: true, avatar: true }
            }
          }
        },
        tags: {
          with: {
            tag: true
          }
        },
        comments: true
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
        },
        members: {
          with: {
            user: {
              columns: { id: true, displayName: true, avatar: true }
            }
          }
        },
        tags: {
          with: {
            tag: true
          }
        },
        comments: true
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
  estimatedValue?: number;
  estimatedUnit?: "minutes" | "hours" | "days";
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
      assignedToId: input.assignedToId ?? null,
      estimatedValue: input.estimatedValue ?? null,
      estimatedUnit: input.estimatedUnit ?? null
    })
    .returning();

  // Add creator as owner member
  await db.insert(taskMembersTable).values({
    taskId: inserted.id,
    userId: input.createdById,
    role: "owner"
  });

  // If assignedToId is specified and differs from the creator, also add as assignee
  if (input.assignedToId && input.assignedToId !== input.createdById) {
    await db.insert(taskMembersTable).values({
      taskId: inserted.id,
      userId: input.assignedToId,
      role: "assignee"
    });
  }

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
    estimatedValue: number | null;
    estimatedUnit: "minutes" | "hours" | "days" | null;
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

    const isCriticalFieldUpdate =
      data.title !== undefined ||
      data.description !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.assignedToId !== undefined;

    const isStatusUpdate = data.status !== undefined;
    const isEstimateUpdate = data.estimatedValue !== undefined || data.estimatedUnit !== undefined;

    if (isCriticalFieldUpdate) {
      await requireTaskPermission(taskId, userId, "owner");
    } else if (isStatusUpdate || isEstimateUpdate) {
      await requireTaskPermission(taskId, userId, "assignee");
    }
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
  if (data.estimatedValue !== undefined)
    updateFields.estimatedValue = data.estimatedValue;
  if (data.estimatedUnit !== undefined)
    updateFields.estimatedUnit = data.estimatedUnit;

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
    await requireTaskPermission(taskId, userId, "owner");
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
    await requireTaskPermission(taskId, userId, "assignee");
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
    if (data.title !== undefined) {
      await requireTaskPermission(taskId, userId, "owner");
    }
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
    await requireTaskPermission(taskId, userId, "owner");
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

// Member Management Functions
async function addTaskMember(
  taskId: number,
  userId: number,
  role: "owner" | "assignee" | "watcher",
  requestingUserId: number
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(task.conversationId, userId);
    await requireTaskPermission(taskId, requestingUserId, "owner");
  }

  const existing = await db.query.taskMembersTable.findFirst({
    where: and(
      eq(taskMembersTable.taskId, taskId),
      eq(taskMembersTable.userId, userId)
    )
  });
  if (existing) throw ApiError.conflict("User is already a member");

  const [member] = await db
    .insert(taskMembersTable)
    .values({ taskId, userId, role })
    .returning();

  if (role === "assignee") {
    await db
      .update(tasksTable)
      .set({ assignedToId: userId })
      .where(eq(tasksTable.id, taskId));
  }

  return member;
}

async function removeTaskMember(taskId: number, memberUserId: number, requestingUserId: number) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(task.conversationId, requestingUserId);
    await requireTaskPermission(taskId, requestingUserId, "owner");
  }

  const member = await db.query.taskMembersTable.findFirst({
    where: and(
      eq(taskMembersTable.taskId, taskId),
      eq(taskMembersTable.userId, memberUserId)
    )
  });
  if (!member) throw ApiError.notFound("Member not found");

  if (member.role === "owner") {
    throw ApiError.badRequest("Cannot remove the task owner");
  }

  await db.delete(taskMembersTable).where(eq(taskMembersTable.id, member.id));

  if (member.role === "assignee") {
    const nextAssignee = await db.query.taskMembersTable.findFirst({
      where: and(
        eq(taskMembersTable.taskId, taskId),
        eq(taskMembersTable.role, "assignee")
      )
    });
    await db
      .update(tasksTable)
      .set({ assignedToId: nextAssignee ? nextAssignee.userId : null })
      .where(eq(tasksTable.id, taskId));
  }

  return { success: true };
}

async function listTaskMembers(taskId: number) {
  return db.query.taskMembersTable.findMany({
    where: eq(taskMembersTable.taskId, taskId),
    with: {
      user: {
        columns: { id: true, displayName: true, avatar: true }
      }
    }
  });
}

async function updateTaskMemberRole(
  taskId: number,
  memberUserId: number,
  newRole: "assignee" | "watcher",
  requestingUserId: number
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(task.conversationId, requestingUserId);
    await requireTaskPermission(taskId, requestingUserId, "owner");
  }

  const member = await db.query.taskMembersTable.findFirst({
    where: and(
      eq(taskMembersTable.taskId, taskId),
      eq(taskMembersTable.userId, memberUserId)
    )
  });
  if (!member) throw ApiError.notFound("Member not found");
  if (member.role === "owner") {
    throw ApiError.badRequest("Cannot change owner role");
  }

  const oldRole = member.role;

  await db
    .update(taskMembersTable)
    .set({ role: newRole })
    .where(eq(taskMembersTable.id, member.id));

  if (newRole === "assignee") {
    await db
      .update(tasksTable)
      .set({ assignedToId: memberUserId })
      .where(eq(tasksTable.id, taskId));
  } else if (oldRole === "assignee" && newRole === "watcher") {
    const nextAssignee = await db.query.taskMembersTable.findFirst({
      where: and(
        eq(taskMembersTable.taskId, taskId),
        eq(taskMembersTable.role, "assignee"),
        ne(taskMembersTable.userId, memberUserId)
      )
    });
    await db
      .update(tasksTable)
      .set({ assignedToId: nextAssignee ? nextAssignee.userId : null })
      .where(eq(tasksTable.id, taskId));
  }

  return db.query.taskMembersTable.findFirst({
    where: eq(taskMembersTable.id, member.id),
    with: { user: { columns: { id: true, displayName: true, avatar: true } } }
  });
}

// Tag Management Functions
async function createConversationTag(
  conversationId: number,
  userId: number,
  data: { name: string; color: string; icon?: string }
) {
  await conversationService.ensureActiveConversationMember(conversationId, userId);

  const existing = await db.query.conversationTagsTable.findFirst({
    where: and(
      eq(conversationTagsTable.conversationId, conversationId),
      ilike(conversationTagsTable.name, data.name)
    )
  });
  if (existing) throw ApiError.conflict("Tag name already exists in this conversation");

  const [tag] = await db
    .insert(conversationTagsTable)
    .values({
      conversationId,
      name: data.name,
      color: data.color,
      icon: data.icon,
      createdById: userId
    })
    .returning();
  return tag;
}

async function listConversationTags(conversationId: number) {
  return db.query.conversationTagsTable.findMany({
    where: eq(conversationTagsTable.conversationId, conversationId)
  });
}

async function deleteConversationTag(tagId: number, userId: number) {
  const tag = await db.query.conversationTagsTable.findFirst({
    where: eq(conversationTagsTable.id, tagId)
  });
  if (!tag) throw ApiError.notFound("Tag not found");

  await conversationService.ensureActiveConversationMember(tag.conversationId, userId);

  await db.delete(conversationTagsTable).where(eq(conversationTagsTable.id, tagId));
  return { success: true };
}

async function addTagToTask(taskId: number, tagId: number, userId: number) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(task.conversationId, userId);
    await requireTaskPermission(taskId, userId, "assignee");
  }

  const tag = await db.query.conversationTagsTable.findFirst({
    where: eq(conversationTagsTable.id, tagId)
  });
  if (!tag) throw ApiError.notFound("Tag not found");
  if (tag.conversationId !== task.conversationId) {
    throw ApiError.badRequest("Tag does not belong to this conversation");
  }

  const existing = await db.query.taskTagsTable.findFirst({
    where: and(
      eq(taskTagsTable.taskId, taskId),
      eq(taskTagsTable.tagId, tagId)
    )
  });
  if (existing) throw ApiError.conflict("Tag already assigned to task");

  const [taskTag] = await db
    .insert(taskTagsTable)
    .values({ taskId, tagId })
    .returning();
  return taskTag;
}

async function removeTagFromTask(taskId: number, tagId: number, userId: number) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(task.conversationId, userId);
    await requireTaskPermission(taskId, userId, "assignee");
  }

  const taskTag = await db.query.taskTagsTable.findFirst({
    where: and(
      eq(taskTagsTable.taskId, taskId),
      eq(taskTagsTable.tagId, tagId)
    )
  });
  if (!taskTag) throw ApiError.notFound("Tag not assigned to this task");

  await db.delete(taskTagsTable).where(eq(taskTagsTable.id, taskTag.id));
  return { success: true };
}

async function listTaskTags(taskId: number) {
  return db.query.taskTagsTable.findMany({
    where: eq(taskTagsTable.taskId, taskId),
    with: {
      tag: true
    }
  });
}

// Comment Functions
async function createComment(
  taskId: number,
  authorId: number,
  content: string,
  parentId?: number
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  let isTaskMember = false;
  if (task.conversationId) {
    try {
      await conversationService.ensureActiveConversationMember(task.conversationId, authorId);
      isTaskMember = true;
    } catch {
      // Not a conversation member - check if user is a task member
      const memberRole = await getTaskMemberRole(taskId, authorId);
      if (memberRole) {
        isTaskMember = true;
      } else {
        throw ApiError.forbidden("You do not have permission to comment on this task");
      }
    }
  } else {
    if (task.createdById !== authorId && task.assignedToId !== authorId) {
      throw ApiError.forbidden("You do not have permission to comment on this task");
    }
  }

  // Validate parent comment if provided
  if (parentId !== undefined) {
    const parentComment = await db.query.taskCommentsTable.findFirst({
      where: and(
        eq(taskCommentsTable.id, parentId),
        eq(taskCommentsTable.taskId, taskId)
      )
    });
    if (!parentComment) throw ApiError.notFound("Parent comment not found");
    // Ensure parent is not itself a reply (single-level threading)
    if (parentComment.parentId !== null) {
      throw ApiError.badRequest("Cannot reply to a reply (only single-level threading supported)");
    }
  }

  const [comment] = await db
    .insert(taskCommentsTable)
    .values({
      taskId,
      authorId,
      parentId: parentId ?? null,
      content
    })
    .returning();

  // Fetch with author info
  const result = await db.query.taskCommentsTable.findFirst({
    where: eq(taskCommentsTable.id, comment.id),
    with: {
      author: {
        columns: { id: true, displayName: true, avatar: true }
      }
    }
  });

  const userIds = await getRecipientUserIds(task.conversationId, task.createdById);
  socketEmitter.emitTaskCommentCreated(task.conversationId, userIds, result!);

  return result;
}

async function listComments(taskId: number) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  // Get all comments for this task
  const comments = await db.query.taskCommentsTable.findMany({
    where: eq(taskCommentsTable.taskId, taskId),
    with: {
      author: {
        columns: { id: true, displayName: true, avatar: true }
      },
      replies: {
        with: {
          author: {
            columns: { id: true, displayName: true, avatar: true }
          }
        },
        orderBy: (tc, { asc }) => [asc(tc.createdAt)]
      }
    },
    orderBy: (tc, { asc }) => [asc(tc.createdAt)]
  });

  // Filter to only top-level comments (parentId is null) and return with their replies
  return comments
    .filter(c => c.parentId === null)
    .map(c => ({
      ...c,
      replies: c.replies.map(r => ({
        ...r,
        author: r.author
      }))
    }));
}

async function updateComment(
  taskId: number,
  commentId: number,
  userId: number,
  content: string
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  const comment = await db.query.taskCommentsTable.findFirst({
    where: and(
      eq(taskCommentsTable.id, commentId),
      eq(taskCommentsTable.taskId, taskId)
    )
  });
  if (!comment) throw ApiError.notFound("Comment not found");
  if (comment.deletedAt) throw ApiError.notFound("Comment not found");

  // Only author can update
  if (comment.authorId !== userId) {
    throw ApiError.forbidden("You can only edit your own comments");
  }

  const [updated] = await db
    .update(taskCommentsTable)
    .set({
      content,
      updatedAt: new Date()
    })
    .where(eq(taskCommentsTable.id, commentId))
    .returning();

  const result = await db.query.taskCommentsTable.findFirst({
    where: eq(taskCommentsTable.id, commentId),
    with: {
      author: {
        columns: { id: true, displayName: true, avatar: true }
      }
    }
  });

  const userIds = await getRecipientUserIds(task.conversationId, task.createdById);
  socketEmitter.emitTaskCommentUpdated(task.conversationId, userIds, result!);

  return result;
}

async function deleteComment(
  taskId: number,
  commentId: number,
  userId: number
) {
  const task = await db.query.tasksTable.findFirst({
    where: eq(tasksTable.id, taskId)
  });
  if (!task) throw ApiError.notFound("Task not found");

  const comment = await db.query.taskCommentsTable.findFirst({
    where: and(
      eq(taskCommentsTable.id, commentId),
      eq(taskCommentsTable.taskId, taskId)
    )
  });
  if (!comment) throw ApiError.notFound("Comment not found");
  if (comment.deletedAt) throw ApiError.notFound("Comment not found");

  // Only author can delete
  if (comment.authorId !== userId) {
    throw ApiError.forbidden("You can only delete your own comments");
  }

  // Hard delete
  await db
    .delete(taskCommentsTable)
    .where(
      or(
        eq(taskCommentsTable.id, commentId),
        eq(taskCommentsTable.parentId, commentId)
      )
    );

  const userIds = await getRecipientUserIds(task.conversationId, task.createdById);
  socketEmitter.emitTaskCommentDeleted(task.conversationId, userIds, {
    taskId,
    commentId
  });

  return { success: true };
}

async function getTaskById(taskId: number, userId: number) {
  const task = await getTaskWithRelations(taskId);
  if (!task) {
    throw ApiError.notFound("Task not found");
  }
  if (task.conversationId) {
    await conversationService.ensureActiveConversationMember(
      task.conversationId,
      userId
    );
  }
  return task;
}

export const taskService = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  // Member management
  addTaskMember,
  removeTaskMember,
  listTaskMembers,
  updateTaskMemberRole,
  // Tag management
  createConversationTag,
  listConversationTags,
  deleteConversationTag,
  addTagToTask,
  removeTagFromTask,
  listTaskTags,
  // Comment management
  createComment,
  listComments,
  updateComment,
  deleteComment
};
