import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateCreateHabitBody,
  validatePatchHabitBody,
  validateHabitStatsQuery,
  validateHabitPanelQuery,
  validateHabitDateBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getHabitsToday,
  getHabits,
  createHabit,
  patchHabit,
  archiveHabit,
  toggleHabit,
  skipHabit,
  skipHabitsDay,
  unskipHabitsDay,
  getHabitStats,
} from "../controllers/habitController.js";

const router = Router();

router.use(authenticate);

router.get("/today", validateHabitPanelQuery, validateRequest, getHabitsToday);
router.get("/stats", validateHabitStatsQuery, validateRequest, getHabitStats);
router.get("/", getHabits);
router.post("/", validateCreateHabitBody, validateRequest, createHabit);
router.post("/skip-day", validateHabitDateBody, validateRequest, skipHabitsDay);
router.post("/unskip-day", validateHabitDateBody, validateRequest, unskipHabitsDay);
router.patch(
  "/:id",
  validateMongoIdParam,
  validatePatchHabitBody,
  validateRequest,
  patchHabit,
);
router.delete("/:id", validateMongoIdParam, validateRequest, archiveHabit);
router.post(
  "/:id/toggle",
  validateMongoIdParam,
  validateHabitDateBody,
  validateRequest,
  toggleHabit,
);
router.post(
  "/:id/skip",
  validateMongoIdParam,
  validateHabitDateBody,
  validateRequest,
  skipHabit,
);

export default router;
