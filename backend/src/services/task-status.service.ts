import { db } from "../drizzle";
import { taskStatusesTable } from "../drizzle/schemas/task-status.schema";
import { tasksTable } from "../drizzle/schemas/task.schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { ApiError } from "../utils/api-error";
import { conversationService } from "./conversation.service";

async function listStatuses(conversationId: number | null, userId: number) {
  const defaultStatuses = [
    { id: -1, conversationId: null, key: "todo", name: "Cần làm", color: "gray", position: 1000 },
    { id: -2, conversationId: null, key: "in_progress", name: "Đang làm", color: "blue", position: 2000 },
    { id: -3, conversationId: null, key: "completed", name: "Hoàn thành", color: "green", position: 3000 }
  ];

  if (!conversationId) {
    return defaultStatuses;
  }

  // Ensure user has access to conversation
  await conversationService.ensureActiveConversationMember(conversationId, userId);

  // Fetch statuses from DB
  let statuses = await db.query.taskStatusesTable.findMany({
    where: eq(taskStatusesTable.conversationId, conversationId),
    orderBy: (t, { asc }) => [asc(t.position)]
  });

  // If empty, auto-seed default statuses for this conversation
  if (statuses.length === 0) {
    const seedData = [
      { conversationId, key: "todo", name: "Cần làm", color: "gray", position: 1000 },
      { conversationId, key: "in_progress", name: "Đang làm", color: "blue", position: 2000 },
      { conversationId, key: "completed", name: "Hoàn thành", color: "green", position: 3000 }
    ];
    await db.insert(taskStatusesTable).values(seedData);

    statuses = await db.query.taskStatusesTable.findMany({
      where: eq(taskStatusesTable.conversationId, conversationId),
      orderBy: (t, { asc }) => [asc(t.position)]
    });
  }

  return statuses;
}

async function createStatus(
  conversationId: number,
  userId: number,
  name: string,
  color = "gray"
) {
  await conversationService.ensureActiveConversationMember(conversationId, userId);

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw ApiError.badRequest("Status name cannot be empty");
  }

  // Key format: status_timestamp
  const key = `status_${Date.now()}`;

  // Find max position
  const currentStatuses = await db.query.taskStatusesTable.findMany({
    where: eq(taskStatusesTable.conversationId, conversationId),
    orderBy: (t, { desc }) => [desc(t.position)],
    limit: 1
  });
  const maxPos = currentStatuses[0]?.position ?? 0;
  const newPos = maxPos + 1000;

  const [inserted] = await db
    .insert(taskStatusesTable)
    .values({
      conversationId,
      key,
      name: trimmedName,
      color,
      position: newPos
    })
    .returning();

  return inserted;
}

async function updateStatus(
  conversationId: number,
  statusId: number,
  userId: number,
  data: Partial<{
    name: string;
    color: string;
    position: number;
  }>
) {
  await conversationService.ensureActiveConversationMember(conversationId, userId);

  const status = await db.query.taskStatusesTable.findFirst({
    where: and(
      eq(taskStatusesTable.id, statusId),
      eq(taskStatusesTable.conversationId, conversationId)
    )
  });

  if (!status) {
    throw ApiError.notFound("Status not found in this conversation");
  }

  const updateFields: Partial<typeof taskStatusesTable.$inferInsert> = {};
  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw ApiError.badRequest("Name cannot be empty");
    updateFields.name = trimmed;
  }
  if (data.color !== undefined) updateFields.color = data.color;
  if (data.position !== undefined) updateFields.position = data.position;

  const [updated] = await db
    .update(taskStatusesTable)
    .set(updateFields)
    .where(and(
      eq(taskStatusesTable.id, statusId),
      eq(taskStatusesTable.conversationId, conversationId)
    ))
    .returning();

  return updated;
}

async function deleteStatus(conversationId: number, statusId: number, userId: number) {
  await conversationService.ensureActiveConversationMember(conversationId, userId);

  const statusToDelete = await db.query.taskStatusesTable.findFirst({
    where: and(
      eq(taskStatusesTable.id, statusId),
      eq(taskStatusesTable.conversationId, conversationId)
    )
  });

  if (!statusToDelete) {
    throw ApiError.notFound("Status not found");
  }

  // Get all other statuses in this conversation
  const remainingStatuses = await db.query.taskStatusesTable.findMany({
    where: and(
      eq(taskStatusesTable.conversationId, conversationId),
      ne(taskStatusesTable.id, statusId)
    ),
    orderBy: (t, { asc }) => [asc(t.position)]
  });

  if (remainingStatuses.length === 0) {
    throw ApiError.badRequest("Cannot delete the only status in this conversation");
  }

  // Fallback status is the first remaining status
  const fallbackStatus = remainingStatuses[0];

  // Execute in transaction: 
  // 1. Move all tasks in deleted status to fallback status
  // 2. Delete the status row
  await db.transaction(async (tx) => {
    await tx
      .update(tasksTable)
      .set({ status: fallbackStatus.key })
      .where(and(
        eq(tasksTable.conversationId, conversationId),
        eq(tasksTable.status, statusToDelete.key)
      ));

    await tx
      .delete(taskStatusesTable)
      .where(and(
        eq(taskStatusesTable.id, statusId),
        eq(taskStatusesTable.conversationId, conversationId)
      ));
  });

  return { success: true };
}

export const taskStatusService = {
  listStatuses,
  createStatus,
  updateStatus,
  deleteStatus
};
