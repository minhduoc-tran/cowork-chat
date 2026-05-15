import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

// Mount all routes here
router.use("/health", healthRoutes);

export default router;