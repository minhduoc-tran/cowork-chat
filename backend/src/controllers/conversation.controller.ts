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
    const limit = Number(req.query.limit ?? 50);
    const before = req.query.before ? Number(req.query.before) : undefined;

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (before !== undefined && (!Number.isInteger(before) || before < 1)) {
      throw ApiError.badRequest("Invalid before message ID");
    }

    const result = await messageService.listConversationMessages({
      conversationId,
      userId: req.user.id,
      limit,
      before
    });

    return ApiResponse.ok(res, "Messages fetched successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function listPins(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    // Ensure caller is a member before exposing pin data
    await conversationService.ensureActiveConversationMember(
      conversationId,
      req.user.id
    );

    const pins = await conversationService.getConversationPins(conversationId);

    return ApiResponse.ok(res, "Pins fetched successfully", { pins });
  } catch (error) {
    return next(error);
  }
}

async function pinMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.body.messageId);
    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (!Number.isInteger(messageId) || messageId < 1) {
      throw ApiError.badRequest("Invalid message ID");
    }

    const pins = await conversationService.pinConversationMessage({
      conversationId,
      messageId,
      userId: req.user.id
    });

    return ApiResponse.ok(res, "Message pinned successfully", { pins });
  } catch (error) {
    return next(error);
  }
}

async function unpinMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (!Number.isInteger(messageId) || messageId < 1) {
      throw ApiError.badRequest("Invalid message ID");
    }

    const pins = await conversationService.unpinConversationMessage({
      conversationId,
      messageId,
      userId: req.user.id
    });

    return ApiResponse.ok(res, "Message unpinned successfully", { pins });
  } catch (error) {
    return next(error);
  }
}

async function recallMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (!Number.isInteger(messageId) || messageId < 1) {
      throw ApiError.badRequest("Invalid message ID");
    }

    const updatedMessage = await messageService.recallMessage(
      conversationId,
      messageId,
      req.user.id
    );

    return ApiResponse.ok(res, "Message recalled successfully", {
      message: updatedMessage
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (!Number.isInteger(messageId) || messageId < 1) {
      throw ApiError.badRequest("Invalid message ID");
    }

    await messageService.deleteMessage(conversationId, messageId, req.user.id);

    return ApiResponse.ok(res, "Message deleted successfully", {});
  } catch (error) {
    return next(error);
  }
}

async function toggleMessageReaction(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);
    const emoji = typeof req.body.emoji === "string" ? req.body.emoji : "";

    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    if (!Number.isInteger(messageId) || messageId < 1) {
      throw ApiError.badRequest("Invalid message ID");
    }

    if (!emoji) {
      throw ApiError.badRequest("Emoji is required");
    }

    const updatedMessage = await messageService.toggleMessageReaction({
      conversationId,
      messageId,
      userId: req.user.id,
      emoji
    });

    return ApiResponse.ok(res, "Message reaction toggled successfully", {
      message: updatedMessage
    });
  } catch (error) {
    return next(error);
  }
}

async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    await conversationService.leaveGroupConversation(
      conversationId,
      req.user.id
    );

    return ApiResponse.ok(res, "Left group successfully", null);
  } catch (error) {
    return next(error);
  }
}

async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    const name = typeof req.body.name === "string" ? req.body.name : undefined;
    const rawMemberIds = Array.isArray(req.body.memberIds)
      ? req.body.memberIds
      : undefined;

    const memberIds = rawMemberIds
      ? rawMemberIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => !isNaN(id))
      : undefined;

    const result = await conversationService.updateGroupConversation(
      conversationId,
      req.user.id,
      { name, memberIds }
    );

    return ApiResponse.ok(res, "Group updated successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function disbandGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId) || conversationId < 1) {
      throw ApiError.badRequest("Invalid conversation ID");
    }

    await conversationService.disbandGroupConversation(
      conversationId,
      req.user.id
    );

    return ApiResponse.ok(res, "Group disbanded successfully", null);
  } catch (error) {
    return next(error);
  }
}

export const conversationController = {
  createGroup,
  listConversations,
  listMessages,
  listPins,
  pinMessage,
  unpinMessage,
  recallMessage,
  deleteMessage,
  toggleMessageReaction,
  leaveGroup,
  updateGroup,
  disbandGroup
};
