import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { taskStatusService } from "../services/task-status.service";

async function listStatuses(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationIdStr = req.params.conversationId;
    const conversationId = conversationIdStr ? Number(conversationIdStr) : null;

    if (conversationIdStr && (isNaN(Number(conversationIdStr)) || Number(conversationIdStr) < 0)) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    const result = await taskStatusService.listStatuses(conversationId, req.user.id);
    return ApiResponse.ok(res, "Task statuses fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function createStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    if (isNaN(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      throw ApiError.badRequest("Name is required");
    }

    const color = typeof req.body.color === "string" ? req.body.color : "gray";

    const result = await taskStatusService.createStatus(conversationId, req.user.id, name, color);
    return ApiResponse.created(res, "Task status created successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const statusId = Number(req.params.statusId);
    if (isNaN(conversationId) || isNaN(statusId) || conversationId < 1 || statusId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : undefined;
    const color = typeof req.body.color === "string" ? req.body.color : undefined;
    const position = typeof req.body.position === "number" ? req.body.position : undefined;

    const result = await taskStatusService.updateStatus(conversationId, statusId, req.user.id, {
      name,
      color,
      position
    });

    return ApiResponse.ok(res, "Task status updated successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function deleteStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const statusId = Number(req.params.statusId);
    if (isNaN(conversationId) || isNaN(statusId) || conversationId < 1 || statusId < 1) {
      throw ApiError.badRequest("Invalid parameters");
    }

    const result = await taskStatusService.deleteStatus(conversationId, statusId, req.user.id);
    return ApiResponse.ok(res, "Task status deleted successfully", result);
  } catch (error) {
    return next(error);
  }
}

export const taskStatusController = {
  listStatuses,
  createStatus,
  updateStatus,
  deleteStatus
};
