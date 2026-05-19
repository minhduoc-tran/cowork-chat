import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  date
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }).unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  coverPhoto: varchar("cover_photo", { length: 500 }),
  bio: text("bio"),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  phone: varchar("phone", { length: 20 }),
  isOnline: boolean("is_online").default(false).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
