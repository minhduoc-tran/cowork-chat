import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index
} from "drizzle-orm/pg-core";
import { usersTable } from "./user.schema";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    familyId: uuid("family_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id")
  },
  table => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
    familyIdIdx: index("refresh_tokens_family_id_idx").on(table.familyId)
  })
);

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
export type NewRefreshToken = typeof refreshTokensTable.$inferInsert;
