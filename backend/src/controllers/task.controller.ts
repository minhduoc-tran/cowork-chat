import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { taskService } from "../services/task.service";

async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationIdStr = req.query.conversationId;
    const conversationId = conversationIdStr
      ? Number(conversationIdStr)
      : undefined;

    if (
      conversationId !== undefined &&
      (isNaN(conversationId) || conversationId < 1)
    ) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    const limitStr = req.query.limit;
    const limit = limitStr ? Number(limitStr) : undefined;
    const offsetStr = req.query.offset;
    const offset = offsetStr ? Number(offsetStr) : undefined;
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : undefined;

    const queryParams: Record<string, unknown> = {};
    Object.keys(req.query).forEach(key => {
      if (
        key !== "limit" &&
        key !== "offset" &&
        key !== "search" &&
        key !== "conversationId"
      ) {
        queryParams[key] = req.query[key];
      }
    });

    const result = await taskService.listTasks({
      userId: req.user.id,
      conversationId,
      limit,
      offset,
      search,
      queryParams
    });

    return ApiResponse.ok(res, "Tasks fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      throw ApiError.badRequest("Title is required");
    }

    const description =
      typeof req.body.description === "string"
        ? req.body.description
        : undefined;
    const conversationId = req.body.conversationId
      ? Number(req.body.conversationId)
      : undefined;
    const dueDate =
      typeof req.body.dueDate === "string" ? req.body.dueDate : undefined;
    const priority =
      typeof req.body.priority === "string" ? req.body.priority : undefined;
    const assignedToId = req.body.assignedToId
      ? Number(req.body.assignedToId)
      : undefined;

    const result = await taskService.createTask({
      title,
      description,
      conversationId,
      dueDate,
      priority,
      createdById: req.user.id,
      assignedToId
    });

    return ApiResponse.created(res, "Task created successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : undefined;
    if (title === "") {
      throw ApiError.badRequest("Title cannot be empty");
    }

    const description =
      typeof req.body.description === "string" || req.body.description === null
        ? req.body.description
        : undefined;
    const status =
      typeof req.body.status === "string" ? req.body.status : undefined;
    const priority =
      typeof req.body.priority === "string" ? req.body.priority : undefined;
    const dueDate =
      typeof req.body.dueDate === "string" || req.body.dueDate === null
        ? req.body.dueDate
        : undefined;
    const assignedToId =
      req.body.assignedToId !== undefined
        ? req.body.assignedToId === null
          ? null
          : Number(req.body.assignedToId)
        : undefined;

    const result = await taskService.updateTask(taskId, req.user.id, {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId
    });

    return ApiResponse.ok(res, "Task updated successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    await taskService.deleteTask(taskId, req.user.id);

    return ApiResponse.ok(res, "Task deleted successfully", null);
  } catch (error) {
    return next(error);
  }
}

// Subtask Controllers
async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      throw ApiError.badRequest("Subtask title is required");
    }

    const result = await taskService.createSubtask(taskId, req.user.id, title);

    return ApiResponse.created(res, "Subtask created successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function updateSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const taskId = Number(req.params.taskId);
    const subtaskId = Number(req.params.subtaskId);
    if (isNaN(taskId) || isNaN(subtaskId) || taskId < 1 || subtaskId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : undefined;
    if (title === "") {
      throw ApiError.badRequest("Subtask title cannot be empty");
    }

    const isCompleted =
      typeof req.body.isCompleted === "boolean"
        ? req.body.isCompleted
        : undefined;

    const result = await taskService.updateSubtask(
      taskId,
      subtaskId,
      req.user.id,
      {
        title,
        isCompleted
      }
    );

    return ApiResponse.ok(res, "Subtask updated successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function deleteSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const taskId = Number(req.params.taskId);
    const subtaskId = Number(req.params.subtaskId);
    if (isNaN(taskId) || isNaN(subtaskId) || taskId < 1 || subtaskId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const result = await taskService.deleteSubtask(
      taskId,
      subtaskId,
      req.user.id
    );

    return ApiResponse.ok(res, "Subtask deleted successfully", result);
  } catch (error) {
    return next(error);
  }
}

export const taskController = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask
};
