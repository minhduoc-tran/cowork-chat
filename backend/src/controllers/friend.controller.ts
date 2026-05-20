import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { friendService } from "../services/friend.service";

async function createRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const receiverId = Number(req.body.receiverId);

    if (!Number.isInteger(receiverId)) {
      throw ApiError.badRequest("receiverId must be an integer");
    }

    const request = await friendService.sendRequest({
      senderId: req.user.id,
      receiverId
    });

    return ApiResponse.created(res, "Friend request sent", { request });
  } catch (error) {
    return next(error);
  }
}

async function acceptRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId)) {
      throw ApiError.badRequest("requestId must be an integer");
    }

    await friendService.acceptRequest({ requestId, receiverId: req.user.id });
    return ApiResponse.ok(res, "Friend request accepted");
  } catch (error) {
    return next(error);
  }
}

async function rejectRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId)) {
      throw ApiError.badRequest("requestId must be an integer");
    }

    await friendService.rejectRequest({ requestId, receiverId: req.user.id });
    return ApiResponse.ok(res, "Friend request rejected");
  } catch (error) {
    return next(error);
  }
}

async function listFriends(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const friends = await friendService.listFriends(req.user.id);
    return ApiResponse.ok(res, "Friends retrieved", { friends });
  } catch (error) {
    return next(error);
  }
}

async function listPendingRequests(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const requests = await friendService.listPendingRequests(req.user.id);
    return ApiResponse.ok(res, "Pending requests retrieved", { requests });
  } catch (error) {
    return next(error);
  }
}

async function listSentRequests(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const requests = await friendService.listSentRequests(req.user.id);
    return ApiResponse.ok(res, "Sent requests retrieved", { requests });
  } catch (error) {
    return next(error);
  }
}

export const friendController = {
  createRequest,
  acceptRequest,
  rejectRequest,
  listFriends,
  listPendingRequests,
  listSentRequests
};
