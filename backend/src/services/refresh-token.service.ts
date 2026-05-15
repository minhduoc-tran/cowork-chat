import { eq, and, isNull } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "crypto";
import { db } from "../drizzle";
import { refreshTokensTable } from "../drizzle/schemas/refresh-token.schema";
import { usersTable } from "../drizzle/schemas/user.schema";
import { signAccessToken } from "../utils/jwt.util";

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface RotationResult {
  success: true;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RotationFailure {
  success: false;
  reason: "invalid" | "expired" | "reused";
}

async function hashToken(token: string): Promise<string> {
  return createHash("sha256").update(token).digest("hex");
}

async function createRefreshToken(
  userId: number,
  familyId?: string
): Promise<{ rawToken: string; familyId: string }> {
  const rawToken = randomBytes(64).toString("hex");
  const tokenHash = await hashToken(rawToken);
  const newFamilyId = familyId || randomUUID();
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash,
    familyId: newFamilyId,
    expiresAt
  });

  return { rawToken, familyId: newFamilyId };
}

async function rotateRefreshToken(
  rawToken: string
): Promise<RotationResult | RotationFailure> {
  const tokenHash = await hashToken(rawToken);

  const tokenRecord = await db.query.refreshTokensTable.findFirst({
    where: and(
      eq(refreshTokensTable.tokenHash, tokenHash),
      isNull(refreshTokensTable.revokedAt)
    )
  });

  if (!tokenRecord) {
    return { success: false, reason: "invalid" };
  }

  if (tokenRecord.expiresAt < new Date()) {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.id, tokenRecord.id));
    return { success: false, reason: "expired" };
  }

  if (tokenRecord.revokedAt) {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, tokenRecord.userId)
    });
    if (user) {
      await revokeAllUserTokens(user.id);
    }
    return { success: false, reason: "reused" };
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, tokenRecord.userId)
  });

  if (!user) {
    return { success: false, reason: "invalid" };
  }

  const { rawToken: newRawToken, familyId } = await createRefreshToken(
    user.id,
    tokenRecord.familyId
  );

  await db
    .update(refreshTokensTable)
    .set({
      revokedAt: new Date(),
      replacedByTokenId: null,
      lastUsedAt: new Date()
    })
    .where(eq(refreshTokensTable.id, tokenRecord.id));

  const accessToken = signAccessToken(user);

  return {
    success: true,
    accessToken,
    refreshToken: newRawToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
  };
}

async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = await hashToken(rawToken);

  const tokenRecord = await db.query.refreshTokensTable.findFirst({
    where: eq(refreshTokensTable.tokenHash, tokenHash)
  });

  if (tokenRecord) {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.id, tokenRecord.id));
  }
}

async function revokeAllUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.userId, userId));
}

async function revokeTokenFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.familyId, familyId));
}

async function getRefreshTokenFamily(rawToken: string): Promise<string | null> {
  const tokenHash = await hashToken(rawToken);

  const tokenRecord = await db.query.refreshTokensTable.findFirst({
    where: eq(refreshTokensTable.tokenHash, tokenHash)
  });

  return tokenRecord?.familyId || null;
}

export const refreshTokenService = {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  revokeTokenFamily,
  getRefreshTokenFamily
};
