import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller";
import { taskStatusController } from "../controllers/task-status.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", conversationController.listConversations);
router.get("/:conversationId/messages", conversationController.listMessages);
router.get("/:conversationId/pins", conversationController.listPins);
router.post("/groups", conversationController.createGroup);
router.post("/:conversationId/leave", conversationController.leaveGroup);
router.put("/:conversationId/group", conversationController.updateGroup);
router.delete("/:conversationId", conversationController.disbandGroup);
router.put("/:conversationId/pin", conversationController.pinMessage);
router.delete(
  "/:conversationId/pins/:messageId",
  conversationController.unpinMessage
);
router.put(
  "/:conversationId/messages/:messageId/recall",
  conversationController.recallMessage
);
router.delete(
  "/:conversationId/messages/:messageId",
  conversationController.deleteMessage
);
router.post(
  "/:conversationId/messages/:messageId/reactions",
  conversationController.toggleMessageReaction
);

// Tag routes
router.post("/:conversationId/tags", conversationController.createTag);
router.get("/:conversationId/tags", conversationController.listConversationTags);
router.delete("/:conversationId/tags/:tagId", conversationController.deleteConversationTag);

// Task Status routes
router.get("/:conversationId/task-statuses", taskStatusController.listStatuses);
router.post("/:conversationId/task-statuses", taskStatusController.createStatus);
router.patch("/:conversationId/task-statuses/:statusId", taskStatusController.updateStatus);
router.delete("/:conversationId/task-statuses/:statusId", taskStatusController.deleteStatus);

export default router;
