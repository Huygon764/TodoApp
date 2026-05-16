import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetReviewsQuery,
  validateReviewDraftQuery,
  validatePostReviewBody,
  validatePatchReviewBody,
  validateAnalyzeReviewsBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getReviews,
  getReviewDraft,
  createReview,
  patchReview,
  analyzeReviews,
} from "../controllers/reviewController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateGetReviewsQuery,
  validateRequest,
  getReviews
);

router.get(
  "/draft",
  validateReviewDraftQuery,
  validateRequest,
  getReviewDraft
);

router.post(
  "/",
  validatePostReviewBody,
  validateRequest,
  createReview
);

router.post(
  "/analyze",
  validateAnalyzeReviewsBody,
  validateRequest,
  analyzeReviews
);

router.patch(
  "/:id",
  validateMongoIdParam,
  validatePatchReviewBody,
  validateRequest,
  patchReview
);

export default router;
