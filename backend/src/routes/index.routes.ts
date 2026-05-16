import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import friendRoutes from "./friend.routes";
import conversationRoutes from "./conversation.routes";
import userRoutes from "./user.routes";

const router = Router();

// Mount all routes here
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/friends", friendRoutes);
router.use("/conversations", conversationRoutes);
router.use("/users", userRoutes);

export default router;
