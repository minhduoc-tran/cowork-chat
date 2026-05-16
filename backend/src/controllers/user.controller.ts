import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { userService } from "../services/user.service";

async function getByEmail(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const email = typeof req.query.email === "string" ? req.query.email : "";
    const result = await userService.findChatTargetByEmail({
      requesterId: req.user.id,
      email
    });

    return ApiResponse.ok(res, "User found", result);
  } catch (error) {
    return next(error);
  }
}

export const userController = {
  getByEmail
};
