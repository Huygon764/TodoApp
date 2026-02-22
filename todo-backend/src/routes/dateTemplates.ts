import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateDateParam,
  validatePatchDateTemplateBody,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getDateTemplate,
  patchDateTemplate,
} from "../controllers/dateTemplateController.js";

const router = Router();

router.use(authenticate);

router.get("/:date", validateDateParam, validateRequest, getDateTemplate);

router.patch(
  "/:date",
  validateDateParam,
  validatePatchDateTemplateBody,
  validateRequest,
  patchDateTemplate
);

export default router;
