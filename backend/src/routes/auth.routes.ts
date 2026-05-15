import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { googleOAuthController } from "../controllers/google-oauth.controller";
import { authMiddleware, csrfMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", csrfMiddleware, authController.logout);
router.post("/refresh", authController.refresh);
router.get("/me", authMiddleware, authController.me);

// Google OAuth
router.get("/google", googleOAuthController.redirectToGoogle);
router.get("/google/callback", googleOAuthController.handleCallback);

export default router;
