import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetRecurringTemplatesQuery,
  validatePostRecurringTemplateBody,
  validateRecurringTemplateTypeParam,
  validateGoalItemIndexParam,
  validatePatchRecurringTemplateItemBody,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getRecurringTemplate,
  addRecurringTemplateItem,
  patchRecurringTemplateItem,
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

router.patch(
  "/:type/items/:idx",
  validateRecurringTemplateTypeParam,
  validateGoalItemIndexParam,
  validatePatchRecurringTemplateItemBody,
  validateRequest,
  patchRecurringTemplateItem
);

router.delete(
  "/:type/items/:idx",
  validateRecurringTemplateTypeParam,
  validateGoalItemIndexParam,
  validateRequest,
  deleteRecurringTemplateItem
);

export default router;
