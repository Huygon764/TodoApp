import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateStayPauseBody,
  validateStayLevelBody,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getStay,
  startStay,
  pauseStay,
  resumeStay,
  setStayLevel,
} from "../controllers/stayController.js";

const router = Router();

router.use(authenticate);

router.get("/", getStay);
router.post("/start", startStay);
router.post("/pause", validateStayPauseBody, validateRequest, pauseStay);
router.post("/resume", resumeStay);
router.post("/level", validateStayLevelBody, validateRequest, setStayLevel);

export default router;
