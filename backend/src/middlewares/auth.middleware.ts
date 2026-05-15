import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { ApiError } from "../utils/api-error";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Access token required");
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: parseInt(payload.sub, 10),
      email: payload.email
    };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}

export function csrfMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const csrfToken = req.headers["x-csrf-token"] as string;
  const cookieToken = req.cookies.csrf_token;

  if (!csrfToken || !cookieToken) {
    throw ApiError.forbidden("CSRF token missing");
  }

  if (csrfToken !== cookieToken) {
    throw ApiError.forbidden("CSRF token mismatch");
  }

  next();
}
