import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetGoalTemplatesQuery,
  validatePostGoalTemplateBody,
  validateGoalTemplateTypeParam,
  validateGoalItemIndexParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getGoalTemplate,
  addGoalTemplateItem,
  deleteGoalTemplateItem,
} from "../controllers/goalTemplateController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateGetGoalTemplatesQuery,
  validateRequest,
  getGoalTemplate
);

router.post(
  "/",
  validatePostGoalTemplateBody,
  validateRequest,
  addGoalTemplateItem
);

router.delete(
  "/:type/items/:idx",
  validateGoalTemplateTypeParam,
  validateGoalItemIndexParam,
  validateRequest,
  deleteGoalTemplateItem
);

export default router;
