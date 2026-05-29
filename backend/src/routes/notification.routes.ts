import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:notificationId/read", notificationController.markAsRead);

export default router;
