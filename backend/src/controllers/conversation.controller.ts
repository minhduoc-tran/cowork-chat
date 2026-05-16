import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { conversationService } from "../services/conversation.service";

async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const name = typeof req.body.name === "string" ? req.body.name : "";
    const memberIds = Array.isArray(req.body.memberIds)
      ? req.body.memberIds.map(Number)
      : [];

    if (memberIds.some(memberId => !Number.isInteger(memberId))) {
      throw ApiError.badRequest("memberIds must contain only integers");
    }

    const result = await conversationService.createGroupConversation({
      creatorId: req.user.id,
      name,
      memberIds
    });

    return ApiResponse.created(res, "Group created successfully", result);
  } catch (error) {
    return next(error);
  }
}

export const conversationController = {
  createGroup
};