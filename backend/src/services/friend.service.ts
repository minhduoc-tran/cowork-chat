import { and, eq, or } from "drizzle-orm";
import { db } from "../drizzle";
import { friendRequestsTable, friendshipsTable, usersTable } from "../drizzle";
import { ApiError } from "../utils/api-error";
import { socketEmitter } from "../socket/socket-emitter";

async function sendRequest(input: { senderId: number; receiverId: number }) {
  const { senderId, receiverId } = input;

  if (senderId === receiverId) {
    throw ApiError.badRequest("Cannot send a friend request to yourself");
  }

  const [sender, receiver] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, senderId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, receiverId) })
  ]);

  if (!sender || !receiver) {
    throw ApiError.notFound("User not found");
  }

  const existingFriendship = await db.query.friendshipsTable.findFirst({
    where: and(
      eq(friendshipsTable.userId, senderId),
      eq(friendshipsTable.friendId, receiverId)
    )
  });

  if (existingFriendship) {
    throw ApiError.conflict("Users are already friends");
  }

  const existingPending = await db.query.friendRequestsTable.findFirst({
    where: and(
      eq(friendRequestsTable.status, "pending"),
      or(
        and(
          eq(friendRequestsTable.senderId, senderId),
          eq(friendRequestsTable.receiverId, receiverId)
        ),
        and(
          eq(friendRequestsTable.senderId, receiverId),
          eq(friendRequestsTable.receiverId, senderId)
        )
      )
    )
  });

  if (existingPending) {
    throw ApiError.conflict("A pending friend request already exists");
  }

  const [request] = await db
    .insert(friendRequestsTable)
    .values({ senderId, receiverId, status: "pending" })
    .returning();

  socketEmitter.emitFriendRequestReceived(receiverId, {
    request,
    sender: {
      id: sender.id,
      email: sender.email,
      displayName: sender.displayName,
      avatar: sender.avatar
    }
  });

  return request;
}

async function acceptRequest(input: { requestId: number; receiverId: number }) {
  const request = await db.query.friendRequestsTable.findFirst({
    where: eq(friendRequestsTable.id, input.requestId)
  });

  if (!request) {
    throw ApiError.notFound("Friend request not found");
  }

  if (request.receiverId !== input.receiverId) {
    throw ApiError.forbidden("You cannot accept this friend request");
  }

  if (request.status !== "pending") {
    throw ApiError.conflict("Friend request is no longer pending");
  }

  const acceptedAt = new Date();

  await db.transaction(async tx => {
    await tx
      .update(friendRequestsTable)
      .set({ status: "accepted", updatedAt: acceptedAt })
      .where(eq(friendRequestsTable.id, input.requestId));

    await tx.insert(friendshipsTable).values([
      { userId: request.senderId, friendId: request.receiverId },
      { userId: request.receiverId, friendId: request.senderId }
    ]);
  });

  const friend = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, request.receiverId)
  });

  const sender = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, request.senderId)
  });

  if (!friend || !sender) {
    throw ApiError.notFound("User not found");
  }

  socketEmitter.emitFriendRequestAccepted(
    [request.senderId, request.receiverId],
    {
      requestId: request.id,
      participants: [
        {
          id: sender.id,
          email: sender.email,
          displayName: sender.displayName,
          avatar: sender.avatar
        },
        {
          id: friend.id,
          email: friend.email,
          displayName: friend.displayName,
          avatar: friend.avatar
        }
      ],
      acceptedAt: acceptedAt.toISOString()
    }
  );
}

async function rejectRequest(input: { requestId: number; receiverId: number }) {
  const request = await db.query.friendRequestsTable.findFirst({
    where: eq(friendRequestsTable.id, input.requestId)
  });

  if (!request) {
    throw ApiError.notFound("Friend request not found");
  }

  if (request.receiverId !== input.receiverId) {
    throw ApiError.forbidden("You cannot reject this friend request");
  }

  if (request.status !== "pending") {
    throw ApiError.conflict("Friend request is no longer pending");
  }

  await db
    .update(friendRequestsTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(friendRequestsTable.id, input.requestId));
}

async function listFriends(userId: number) {
  return db.query.friendshipsTable.findMany({
    where: eq(friendshipsTable.userId, userId),
    with: {
      friend: true
    }
  });
}

async function listPendingRequests(userId: number) {
  return db.query.friendRequestsTable.findMany({
    where: and(
      eq(friendRequestsTable.receiverId, userId),
      eq(friendRequestsTable.status, "pending")
    ),
    with: {
      sender: true
    }
  });
}

async function listSentRequests(userId: number) {
  return db.query.friendRequestsTable.findMany({
    where: and(
      eq(friendRequestsTable.senderId, userId),
      eq(friendRequestsTable.status, "pending")
    ),
    with: {
      receiver: true
    }
  });
}

export const friendService = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  listFriends,
  listPendingRequests,
  listSentRequests
};
