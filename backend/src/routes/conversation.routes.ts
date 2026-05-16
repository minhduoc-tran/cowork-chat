import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", conversationController.listConversations);
router.get("/:conversationId/messages", conversationController.listMessages);
router.post("/groups", conversationController.createGroup);

export default router;
