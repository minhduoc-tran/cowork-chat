import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { userController } from "../controllers/user.controller";

const router = Router();

router.use(authMiddleware);
router.get("/by-email", userController.getByEmail);
router.patch("/me", userController.updateProfile);

export default router;
