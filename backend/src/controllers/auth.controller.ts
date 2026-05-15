import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../constants/status-codes";
import { authService } from "../services/auth.service";
import { refreshTokenService } from "../services/refresh-token.service";
import { ApiError } from "../utils/api-error";

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function sendSuccess(
  res: Response,
  data: unknown,
  statusCode: number,
  message: string
) {
  res.status(statusCode).json({
    success: true,
    message,
    statusCode,
    data
  });
}

async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      throw ApiError.badRequest(
        "Email, password, and displayName are required"
      );
    }

    const result = await authService.register(email, password, displayName);

    res.cookie(
      "refresh_token",
      result.refreshToken,
      REFRESH_TOKEN_COOKIE_OPTIONS
    );

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      },
      STATUS_CODES.CREATED,
      "Registered successfully"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email already registered"
    ) {
      next(ApiError.conflict("Email already registered"));
    } else {
      next(error);
    }
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest("Email and password are required");
    }

    const result = await authService.login(email, password);

    res.cookie(
      "refresh_token",
      result.refreshToken,
      REFRESH_TOKEN_COOKIE_OPTIONS
    );

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      },
      STATUS_CODES.OK,
      "Logged in successfully"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      next(ApiError.unauthorized("Invalid email or password"));
    } else {
      next(error);
    }
  }
}

async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      await refreshTokenService.revokeRefreshToken(refreshToken);
    }

    res.clearCookie("refresh_token", {
      path: "/api/v1/auth"
    });

    sendSuccess(res, null, STATUS_CODES.OK, "Logged out successfully");
  } catch (error) {
    next(error);
  }
}

async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      throw ApiError.unauthorized("Refresh token not found");
    }

    const result = await refreshTokenService.rotateRefreshToken(refreshToken);

    if (!result.success) {
      res.clearCookie("refresh_token", { path: "/api/v1/auth" });

      switch (result.reason) {
        case "expired":
          throw ApiError.unauthorized("Refresh token expired");
        case "invalid":
          throw ApiError.unauthorized("Invalid refresh token");
        case "reused":
          throw ApiError.forbidden("Token reuse detected");
      }
    }

    res.cookie(
      "refresh_token",
      result.refreshToken,
      REFRESH_TOKEN_COOKIE_OPTIONS
    );

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      },
      STATUS_CODES.OK,
      "Token refreshed successfully"
    );
  } catch (error) {
    next(error);
  }
}

async function me(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw ApiError.unauthorized("Not authenticated");
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    sendSuccess(_res, { user }, STATUS_CODES.OK, "Current user retrieved");
  } catch (error) {
    next(error);
  }
}

export const authController = {
  register,
  login,
  logout,
  refresh,
  me
};
