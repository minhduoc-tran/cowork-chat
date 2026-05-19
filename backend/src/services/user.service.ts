import { eq, and } from "drizzle-orm";
import { db, usersTable, friendshipsTable } from "../drizzle";
import { ApiError } from "../utils/api-error";
import type { SafeUser } from "../types/auth.types";

export type FindChatTargetByEmailInput = {
  requesterId: number;
  email: string;
};

export type UpdateProfileInput = {
  userId: number;
  displayName?: string;
  bio?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
};

async function findChatTargetByEmail(input: FindChatTargetByEmailInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw ApiError.badRequest("Email is required");
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, normalizedEmail)
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.id === input.requesterId) {
    throw ApiError.badRequest("Cannot start a chat with yourself");
  }

  const friendship = await db.query.friendshipsTable.findFirst({
    where: and(
      eq(friendshipsTable.userId, input.requesterId),
      eq(friendshipsTable.friendId, user.id)
    )
  });

  return {
    user,
    isFriend: Boolean(friendship)
  };
}

async function updateProfile(input: UpdateProfileInput): Promise<SafeUser> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, input.userId)
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date()
  };

  if (input.displayName !== undefined && input.displayName.trim()) {
    updates.displayName = input.displayName.trim();
  }

  if (input.bio !== undefined) {
    updates.bio = input.bio;
  }

  if (input.gender !== undefined) {
    updates.gender = input.gender;
  }

  if (input.dateOfBirth !== undefined) {
    updates.dateOfBirth = input.dateOfBirth;
  }

  if (input.phone !== undefined) {
    updates.phone = input.phone;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, input.userId))
    .returning();

  return {
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    avatar: updated.avatar,
    coverPhoto: updated.coverPhoto,
    bio: updated.bio,
    gender: updated.gender,
    dateOfBirth: updated.dateOfBirth,
    phone: updated.phone
  };
}

export const userService = {
  findChatTargetByEmail,
  updateProfile
};
