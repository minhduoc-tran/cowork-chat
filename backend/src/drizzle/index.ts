import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as userSchema from "./schemas/user.schema";
import * as refreshTokenSchema from "./schemas/refresh-token.schema";
import * as friendSchema from "./schemas/friend.schema";
import * as conversationSchema from "./schemas/conversation.schema";
import * as messageSchema from "./schemas/message.schema";
import * as attachmentSchema from "./schemas/attachment.schema";
import * as reactionSchema from "./schemas/reaction.schema";
import * as taskSchema from "./schemas/task.schema";
import * as taskCommentSchema from "./schemas/task-comment.schema";
import * as taskStatusSchema from "./schemas/task-status.schema";
import * as notificationSchema from "./schemas/notification.schema";
import env from "../configs/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const db = drizzle({
  client: pool,
  schema: {
    ...userSchema,
    ...refreshTokenSchema,
    ...friendSchema,
    ...conversationSchema,
    ...messageSchema,
    ...attachmentSchema,
    ...reactionSchema,
    ...taskSchema,
    ...taskCommentSchema,
    ...taskStatusSchema,
    ...notificationSchema
  }
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
export * from "./schemas/task.schema";
export * from "./schemas/task-comment.schema";
export * from "./schemas/task-status.schema";
export * from "./schemas/notification.schema";
