import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { conversationService } from "../services/conversation.service";
import { messageService } from "../services/message.service";

async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const name = typeof req.body.name === "string" ? req.body.name : "";
    const rawMemberIds = Array.isArray(req.body.memberIds)
      ? req.body.memberIds
      : [];
    const memberIds = rawMemberIds.map((id: unknown) => Number(id));

    if (memberIds.some((memberId: number) => !Number.isInteger(memberId))) {
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

async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const result = await conversationService.listUserConversations(req.user.id);
    return ApiResponse.ok(res, "Conversations fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function listMessages(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    const messages = await messageService.listConversationMessages({
      conversationId,
      userId: req.user.id,
      limit
    });

    return ApiResponse.ok(res, "Messages fetched successfully", { messages });
  } catch (error) {
    return next(error);
  }
}

export const conversationController = {
  createGroup,
  listConversations,
  listMessages
};
