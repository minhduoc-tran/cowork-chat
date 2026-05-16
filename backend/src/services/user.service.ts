import { eq, and } from "drizzle-orm";
import { db, usersTable, friendshipsTable } from "../drizzle";
import { ApiError } from "../utils/api-error";

export type FindChatTargetByEmailInput = {
  requesterId: number;
  email: string;
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

export const userService = {
  findChatTargetByEmail
};
