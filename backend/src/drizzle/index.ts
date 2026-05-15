import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as userSchema from "./schemas/user.schema";
import * as refreshTokenSchema from "./schemas/refresh-token.schema";
import env from "../configs/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const db = drizzle({
  client: pool,
  schema: { ...userSchema, ...refreshTokenSchema }
});

export { db };

export * from "./schemas/user.schema";
export * from "./schemas/user-relations.schema";
export * from "./schemas/friend.schema";
export * from "./schemas/conversation.schema";
export * from "./schemas/message.schema";
export * from "./schemas/attachment.schema";
export * from "./schemas/reaction.schema";
export * from "./schemas/refresh-token.schema";
