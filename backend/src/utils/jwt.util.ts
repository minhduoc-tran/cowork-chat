import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import env from "../configs/env";
import type {
  AccessTokenPayload,
  OAuthStatePayload
} from "../types/auth.types";

const ACCESS_TOKEN_EXPIRY = "15m";
const OAUTH_STATE_EXPIRY = "10m";

export function generateJti(): string {
  return randomBytes(16).toString("hex");
}

export function signAccessToken(user: { id: number; email: string }): string {
  const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
    sub: String(user.id),
    email: user.email,
    type: "access",
    jti: generateJti()
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"]
  }) as AccessTokenPayload;

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
}

export function signOAuthState(
  payload: Omit<OAuthStatePayload, "iat" | "exp">
): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: OAUTH_STATE_EXPIRY
  });
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const payload = jwt.verify(state, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"]
  }) as OAuthStatePayload;

  if (payload.provider !== "google") {
    throw new Error("Invalid OAuth provider");
  }

  return payload;
}
