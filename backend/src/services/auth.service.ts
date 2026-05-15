import bcrypt from "bcryptjs";
import { randomBytes, createHash, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { usersTable } from "../drizzle/schemas/user.schema";
import { refreshTokensTable } from "../drizzle/schemas/refresh-token.schema";
import { signAccessToken } from "../utils/jwt.util";
import type { SafeUser, AuthSessionResult } from "../types/auth.types";
import type { User } from "../drizzle/schemas/user.schema";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar
  };
}

async function generateAuthSession(user: User): Promise<AuthSessionResult> {
  const accessToken = signAccessToken(user);

  const rawRefreshToken = randomBytes(64).toString("hex");
  const tokenHash = await hashToken(rawRefreshToken);
  const familyId = randomUUID();
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash,
    familyId,
    expiresAt
  });

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
  };
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function hashToken(token: string): Promise<string> {
  return createHash("sha256").update(token).digest("hex");
}

async function register(
  email: string,
  password: string,
  displayName: string
): Promise<AuthSessionResult> {
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email)
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      displayName
    })
    .returning();

  return generateAuthSession(user);
}

async function login(
  email: string,
  password: string
): Promise<AuthSessionResult> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email)
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  return generateAuthSession(user);
}

async function getUserById(id: number): Promise<SafeUser | null> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id)
  });

  return user ? toSafeUser(user) : null;
}

export const authService = {
  register,
  login,
  hashPassword,
  verifyPassword,
  generateAuthSession,
  getUserById,
  hashToken
};
