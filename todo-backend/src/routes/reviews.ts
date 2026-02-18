import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  validateGetReviewsQuery,
  validatePostReviewBody,
  validatePatchReviewBody,
  validateAnalyzeReviewsBody,
  validateMongoIdParam,
} from "../middleware/validation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  getReviews,
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
