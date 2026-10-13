import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { createRateLimit } from "../middleware/rateLimit.js";
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

const analyzeLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  key: (req) => req.user?.userId ?? req.ip ?? "unknown",
});

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
  analyzeLimiter,
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
