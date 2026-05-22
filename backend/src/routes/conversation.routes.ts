import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", conversationController.listConversations);
router.get("/:conversationId/messages", conversationController.listMessages);
router.get("/:conversationId/pins", conversationController.listPins);
router.post("/groups", conversationController.createGroup);
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

export default router;
