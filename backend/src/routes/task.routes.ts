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

// Member routes
router.post("/:taskId/members", taskController.addTaskMember);
router.get("/:taskId/members", taskController.listTaskMembers);
router.patch("/:taskId/members/:userId", taskController.updateTaskMemberRole);
router.delete("/:taskId/members/:userId", taskController.removeTaskMember);

// Tag association routes
router.post("/:taskId/tags", taskController.addTagToTask);
router.get("/:taskId/tags", taskController.listTaskTags);
router.delete("/:taskId/tags/:tagId", taskController.removeTagFromTask);

export default router;
