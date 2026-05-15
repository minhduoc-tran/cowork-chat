import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema";
import { friendRequestsTable } from "./friend.schema";
import { friendshipsTable } from "./friend.schema";
import { conversationMembersTable } from "./conversation.schema";
import { messagesTable } from "./message.schema";

export const usersRelations = relations(usersTable, ({ many }) => ({
  sentFriendRequests: many(friendRequestsTable, { relationName: "sender" }),
  receivedFriendRequests: many(friendRequestsTable, { relationName: "receiver" }),
  friendships: many(friendshipsTable, { relationName: "user" }),
  conversationMemberships: many(conversationMembersTable),
  messages: many(messagesTable),
}));