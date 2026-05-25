import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", taskController.listTasks);
router.post("/", taskController.createTask);
router.patch("/:taskId", taskController.updateTask);
router.delete("/:taskId", taskController.deleteTask);

router.post("/:taskId/subtasks", taskController.createSubtask);
router.patch("/:taskId/subtasks/:subtaskId", taskController.updateSubtask);
router.delete("/:taskId/subtasks/:subtaskId", taskController.deleteSubtask);

export default router;
