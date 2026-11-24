import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validatePomodoroSettingsBody } from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getPomodoro,
  startPomodoroTimer,
  pausePomodoroTimer,
  resumePomodoroTimer,
  stopPomodoroTimer,
  putPomodoroSettings,
} from "../controllers/pomodoroController.js";

const router = Router();

router.use(authenticate);

router.get("/", getPomodoro);
router.post("/start", startPomodoroTimer);
router.post("/pause", pausePomodoroTimer);
router.post("/resume", resumePomodoroTimer);
router.post("/stop", stopPomodoroTimer);
router.put(
  "/settings",
  validatePomodoroSettingsBody,
  validateRequest,
  putPomodoroSettings,
);

export default router;
