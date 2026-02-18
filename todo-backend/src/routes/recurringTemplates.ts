import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetRecurringTemplatesQuery,
  validatePostRecurringTemplateBody,
  validateRecurringTemplateTypeParam,
  validateGoalItemIndexParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getRecurringTemplate,
  addRecurringTemplateItem,
  deleteRecurringTemplateItem,
} from "../controllers/recurringTemplateController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateGetRecurringTemplatesQuery,
  validateRequest,
  getRecurringTemplate
);

router.post(
  "/",
  validatePostRecurringTemplateBody,
  validateRequest,
  addRecurringTemplateItem
);

router.delete(
  "/:type/items/:idx",
  validateRecurringTemplateTypeParam,
  validateGoalItemIndexParam,
  validateRequest,
  deleteRecurringTemplateItem
);

export default router;
