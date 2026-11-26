import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateTimerStartBody,
  validateTimerAddBody,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getTimer,
  startTimerRun,
  pauseTimerRun,
  resumeTimerRun,
  addTimerTime,
  stopTimerRun,
  dismissTimerRun,
} from "../controllers/timerController.js";

const router = Router();

router.use(authenticate);

router.get("/", getTimer);
router.post("/start", validateTimerStartBody, validateRequest, startTimerRun);
router.post("/pause", pauseTimerRun);
router.post("/resume", resumeTimerRun);
router.post("/add", validateTimerAddBody, validateRequest, addTimerTime);
router.post("/stop", stopTimerRun);
router.post("/dismiss", dismissTimerRun);

export default router;
