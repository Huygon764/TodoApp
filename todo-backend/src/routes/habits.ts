import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateCreateHabitBody,
  validatePatchHabitBody,
  validateHabitStatsQuery,
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
  getHabitStats,
} from "../controllers/habitController.js";

const router = Router();

router.use(authenticate);

router.get("/today", getHabitsToday);
router.get("/stats", validateHabitStatsQuery, validateRequest, getHabitStats);
router.get("/", getHabits);
router.post("/", validateCreateHabitBody, validateRequest, createHabit);
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
  validateRequest,
  toggleHabit,
);

export default router;
