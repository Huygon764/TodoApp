import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validateDateParam, validatePatchDayBody } from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { getDay, patchDay } from "../controllers/dayController.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  "/:date",
  validateDateParam,
  validateRequest,
  getDay
);

router.patch(
  "/:date",
  validateDateParam,
  validatePatchDayBody,
  validateRequest,
  patchDay
);

export default router;
