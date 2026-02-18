import type { Request, Response } from "express";
import { Review } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import { generateAnalysis } from "../services/geminiService.js";
import type { IReviewDocument } from "../types/index.js";
import { getWeekRangeForMonth } from "../utils/datePeriod.js";

/**
 * GET /api/reviews
 * - ?type=week&period=2026-W08 → single review for that week
 * - ?type=month&period=2026-02 → single review for that month
 * - ?month=2026-02 → all reviews for that month (1 month + weeks in month)
 * - ?from= &to= (week periods) → legacy range
 */
export const getReviews = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { type, period, month, from, to } = req.query as {
    type?: string;
    period?: string;
    month?: string;
    from?: string;
    to?: string;
  };

  if (month) {
    const { from: weekFrom, to: weekTo } = getWeekRangeForMonth(month);
    const reviews = await Review.find({
      userId,
      $or: [
        { type: "month", period: month },
        { type: "week", period: { $gte: weekFrom, $lte: weekTo } },
      ],
    }).sort({ type: 1, period: 1 });
    return sendSuccess(res, 200, { reviews });
  }

  if (type && period) {
    const review = await Review.findOne({ userId, type: type as "week" | "month", period });
    return sendSuccess(res, 200, { reviews: review ? [review] : [] });
  }

  const filter: { userId: unknown; period?: unknown } = { userId };
  if (period) filter.period = period;
  else if (from && to) filter.period = { $gte: from, $lte: to };

  const reviews = await Review.find(filter).sort({ period: -1 });
  sendSuccess(res, 200, { reviews });
});

/**
 * POST /api/reviews
 * Body: { type, period, goodThings?, badThings?, notes? }
 */
export const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { type, period, goodThings, badThings, notes } = req.body as {
    type: "week" | "month";
    period: string;
    goodThings?: string[];
    badThings?: string[];
    notes?: string;
  };

  let review = await Review.findOne({ userId, type, period });

  if (review) {
    if (Array.isArray(goodThings)) review.goodThings = goodThings.filter(Boolean);
    if (Array.isArray(badThings)) review.badThings = badThings.filter(Boolean);
    if (typeof notes === "string") review.notes = notes;
    await review.save();
    return sendSuccess(res, 200, { review });
  }

  review = await Review.create({
    userId,
    type,
    period,
    goodThings: Array.isArray(goodThings) ? goodThings.filter(Boolean) : [],
    badThings: Array.isArray(badThings) ? badThings.filter(Boolean) : [],
    notes: typeof notes === "string" ? notes : "",
  });

  sendSuccess(res, 201, { review });
});

/**
 * PATCH /api/reviews/:id
 */
export const patchReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { goodThings, badThings, notes } = req.body as {
    goodThings?: string[];
    badThings?: string[];
    notes?: string;
  };

  const review = await Review.findOne({ _id: id, userId });
  if (!review) {
    throw notFound(MESSAGES.REVIEW.NOT_FOUND);
  }

  if (Array.isArray(goodThings)) review.goodThings = goodThings.filter(Boolean);
  if (Array.isArray(badThings)) review.badThings = badThings.filter(Boolean);
  if (typeof notes === "string") review.notes = notes;
  await review.save();

  sendSuccess(res, 200, { review });
});

/**
 * POST /api/reviews/analyze
 * Body: { reviewIds: string[] } or { from: string, to: string } (week periods)
 * Returns AI analysis text (not stored).
 */
export const analyzeReviews = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = req.body as {
    reviewIds?: string[];
    from?: string;
    to?: string;
  };

  let reviews: IReviewDocument[] = [];

  if (Array.isArray(body.reviewIds) && body.reviewIds.length > 0) {
    reviews = await Review.find({
      _id: { $in: body.reviewIds },
      userId,
    }).sort({ period: 1 });
  } else if (body.from && body.to) {
    reviews = await Review.find({
      userId,
      period: { $gte: body.from, $lte: body.to },
    }).sort({ period: 1 });
  }

  if (reviews.length === 0) {
    return sendSuccess(res, 200, {
      analysis: "No reviews to analyze. Add some reviews first.",
    });
  }

  const prompt = reviews
    .map(
      (r) =>
        `## Week ${r.period}\n` +
        `Good: ${(r.goodThings ?? []).join("; ") || "(none)"}\n` +
        `Bad: ${(r.badThings ?? []).join("; ") || "(none)"}\n` +
        `Notes: ${r.notes || "(none)"}`
    )
    .join("\n\n");

  const fullPrompt = `You are a supportive coach. Analyze these weekly self-reviews and give concise, constructive feedback (2-4 short paragraphs). Focus on patterns, encouragement, and 1-2 concrete suggestions. Write in the same language as the reviews.\n\n${prompt}`;

  const analysis = await generateAnalysis(fullPrompt);
  sendSuccess(res, 200, { analysis });
});
