import { Router } from "express";
import { friendController } from "../controllers/friend.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", friendController.listFriends);
router.get("/requests/pending", friendController.listPendingRequests);
router.post("/requests", friendController.createRequest);
router.post("/requests/:requestId/accept", friendController.acceptRequest);
router.post("/requests/:requestId/reject", friendController.rejectRequest);

export default router;
