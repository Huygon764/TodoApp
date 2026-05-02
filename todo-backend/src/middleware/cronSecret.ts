import { timingSafeEqual } from "crypto";
import type { RequestHandler } from "express";
import { env } from "../config/index.js";
import { sendError } from "../utils/index.js";

export const requireCronSecret: RequestHandler = (req, res, next) => {
  const provided = req.header("x-cron-secret") || "";
  const expected = env.cronSecret;

  if (!expected) {
    sendError(res, 503, "Cron auth not configured");
    return;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    sendError(res, 401, "Invalid cron secret");
    return;
  }

  next();
};
