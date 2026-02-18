import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetGoalsQuery,
  validatePostGoalBody,
  validatePatchGoalBody,
  validateMongoIdParam,
  validateGoalItemIndexParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getGoal,
  createGoal,
  patchGoal,
  deleteGoalItem,
} from "../controllers/goalController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateGetGoalsQuery,
  validateRequest,
  getGoal
);

router.post(
  "/",
  validatePostGoalBody,
  validateRequest,
  createGoal
);

router.patch(
  "/:id",
  validateMongoIdParam,
  validatePatchGoalBody,
  validateRequest,
  patchGoal
);

router.delete(
  "/:id/items/:idx",
  validateMongoIdParam,
  validateGoalItemIndexParam,
  validateRequest,
  deleteGoalItem
);

export default router;
