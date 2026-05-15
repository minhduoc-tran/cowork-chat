import { Request, Response, NextFunction } from "express";
import { googleOAuthService } from "../services/google-oauth.service";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

async function redirectToGoogle(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = await googleOAuthService.generateAuthUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
}

async function handleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw ApiError.badRequest("Missing code or state parameter");
    }

    const result = await googleOAuthService.handleCallback(
      code as string,
      state as string
    );

    res.cookie(
      "refresh_token",
      result.refreshToken,
      REFRESH_TOKEN_COOKIE_OPTIONS
    );

    const csrfToken = crypto.randomUUID();
    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&expiresIn=${result.expiresIn}&csrfToken=${csrfToken}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("OAuth state")) {
      next(ApiError.forbidden("Invalid OAuth state"));
    } else {
      next(error);
    }
  }
}

export const googleOAuthController = {
  redirectToGoogle,
  handleCallback
};
