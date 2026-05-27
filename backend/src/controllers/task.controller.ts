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
    const estimatedValue =
      typeof req.body.estimatedValue === "number"
        ? req.body.estimatedValue
        : undefined;
    const estimatedUnit =
      ["minutes", "hours", "days"].includes(req.body.estimatedUnit)
        ? req.body.estimatedUnit
        : undefined;

    const result = await taskService.createTask({
      title,
      description,
      conversationId,
      dueDate,
      priority,
      createdById: req.user.id,
      assignedToId,
      estimatedValue,
      estimatedUnit
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
    const estimatedValue =
      typeof req.body.estimatedValue === "number" || req.body.estimatedValue === null
        ? req.body.estimatedValue
        : undefined;
    const estimatedUnit =
      ["minutes", "hours", "days", null].includes(req.body.estimatedUnit)
        ? req.body.estimatedUnit
        : undefined;

    const result = await taskService.updateTask(taskId, req.user.id, {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId,
      estimatedValue,
      estimatedUnit
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

// Member Controllers
async function addTaskMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const userId = req.body.userId ? Number(req.body.userId) : undefined;
    if (!userId) throw ApiError.badRequest("User ID is required");

    const role = req.body.role;
    if (!["owner", "assignee", "watcher"].includes(role)) {
      throw ApiError.badRequest("Invalid role");
    }

    const result = await taskService.addTaskMember(taskId, userId, role, req.user.id);
    return ApiResponse.created(res, "Member added successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function listTaskMembers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const result = await taskService.listTaskMembers(taskId);
    return ApiResponse.ok(res, "Members fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function updateTaskMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    const userId = Number(req.params.userId);
    if (isNaN(taskId) || isNaN(userId) || taskId < 1 || userId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const role = req.body.role;
    if (!["assignee", "watcher"].includes(role)) {
      throw ApiError.badRequest("Role must be 'assignee' or 'watcher'");
    }

    const result = await taskService.updateTaskMemberRole(taskId, userId, role, req.user.id);
    return ApiResponse.ok(res, "Member role updated", result);
  } catch (error) {
    return next(error);
  }
}

async function removeTaskMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    const userId = Number(req.params.userId);
    if (isNaN(taskId) || isNaN(userId) || taskId < 1 || userId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    await taskService.removeTaskMember(taskId, userId, req.user.id);
    return ApiResponse.ok(res, "Member removed successfully", null);
  } catch (error) {
    return next(error);
  }
}

// Tag Association Controllers
async function addTagToTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const tagId = req.body.tagId ? Number(req.body.tagId) : undefined;
    if (!tagId) throw ApiError.badRequest("Tag ID is required");

    const result = await taskService.addTagToTask(taskId, tagId, req.user.id);
    return ApiResponse.created(res, "Tag added to task", result);
  } catch (error) {
    return next(error);
  }
}

async function listTaskTags(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const result = await taskService.listTaskTags(taskId);
    return ApiResponse.ok(res, "Task tags fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function removeTagFromTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    const tagId = Number(req.params.tagId);
    if (isNaN(taskId) || isNaN(tagId) || taskId < 1 || tagId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    await taskService.removeTagFromTask(taskId, tagId, req.user.id);
    return ApiResponse.ok(res, "Tag removed from task", null);
  } catch (error) {
    return next(error);
  }
}

// Comment Controllers
async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      throw ApiError.badRequest("Content is required");
    }

    const parentId = req.body.parentId !== undefined && req.body.parentId !== null
      ? Number(req.body.parentId)
      : undefined;
    if (parentId !== undefined && (isNaN(parentId) || parentId < 1)) {
      throw ApiError.badRequest("Invalid parent comment ID");
    }

    const result = await taskService.createComment(taskId, req.user.id, content, parentId);
    return ApiResponse.created(res, "Comment created successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function listComments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    if (isNaN(taskId) || taskId < 1) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const result = await taskService.listComments(taskId);
    return ApiResponse.ok(res, "Comments fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function updateComment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    const commentId = Number(req.params.commentId);
    if (isNaN(taskId) || isNaN(commentId) || taskId < 1 || commentId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      throw ApiError.badRequest("Content is required");
    }

    const result = await taskService.updateComment(taskId, commentId, req.user.id, content);
    return ApiResponse.ok(res, "Comment updated successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

    const taskId = Number(req.params.taskId);
    const commentId = Number(req.params.commentId);
    if (isNaN(taskId) || isNaN(commentId) || taskId < 1 || commentId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    await taskService.deleteComment(taskId, commentId, req.user.id);
    return ApiResponse.ok(res, "Comment deleted successfully", null);
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
  deleteSubtask,
  // Member management
  addTaskMember,
  listTaskMembers,
  updateTaskMemberRole,
  removeTaskMember,
  // Tag associations
  addTagToTask,
  listTaskTags,
  removeTagFromTask,
  // Comment management
  createComment,
  listComments,
  updateComment,
  deleteComment
};
