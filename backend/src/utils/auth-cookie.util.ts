import { randomUUID } from "crypto";
import type { Response } from "express";

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const CSRF_TOKEN_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export function setAuthCookies(res: Response, refreshToken: string) {
  const csrfToken = randomUUID();

  res.cookie("refresh_token", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  res.cookie("csrf_token", csrfToken, CSRF_TOKEN_COOKIE_OPTIONS);

  return csrfToken;
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("refresh_token", {
    path: "/api/v1/auth"
  });
  res.clearCookie("csrf_token", {
    path: "/"
  });
}
