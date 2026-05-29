import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { notificationService } from "../services/notification.service";

async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const limitStr = req.query.limit;
    const offsetStr = req.query.offset;
    const limit = limitStr ? Number(limitStr) : undefined;
    const offset = offsetStr ? Number(offsetStr) : undefined;

    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      throw ApiError.badRequest("Invalid limit");
    }
    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      throw ApiError.badRequest("Invalid offset");
    }

    const result = await notificationService.listNotifications(
      req.user.id,
      limit,
      offset
    );

    return ApiResponse.ok(res, "Notifications fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    return ApiResponse.ok(res, "Unread count fetched successfully", {
      unreadCount
    });
  } catch (error) {
    return next(error);
  }
}

async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const notificationId = Number(req.params.notificationId);
    if (isNaN(notificationId) || notificationId < 1) {
      throw ApiError.badRequest("Invalid notification ID");
    }

    const updated = await notificationService.markAsRead(
      notificationId,
      req.user.id
    );
    if (!updated) {
      throw ApiError.notFound("Notification not found");
    }

    return ApiResponse.ok(res, "Notification marked as read", updated);
  } catch (error) {
    return next(error);
  }
}

async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const result = await notificationService.markAllAsRead(req.user.id);
    return ApiResponse.ok(res, "All notifications marked as read", result);
  } catch (error) {
    return next(error);
  }
}

export const notificationController = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
