import type { Request, Response, NextFunction } from "express";
import { tooManyRequests } from "../utils/index.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  /** Defaults to the client IP (respects `trust proxy`). */
  key?: (req: Request) => string;
}

/**
 * Minimal in-memory fixed-window rate limiter keyed by client IP.
 * Note: state is per-process (resets on restart, not shared across
 * instances). Acceptable here as defense-in-depth on top of single-use,
 * high-entropy invite codes on a single-instance deployment.
 */
export function createRateLimit({
  windowMs,
  max,
  message = "Too many requests, please try again later",
  key = (req) => req.ip ?? "unknown",
}: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodically drop stale buckets so the map does not grow unbounded
  // for IPs that never return. unref() keeps it from holding the process.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const bucket = key(req);
    const now = Date.now();
    const entry = hits.get(bucket);

    if (!entry || now > entry.resetAt) {
      hits.set(bucket, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > max) {
      next(tooManyRequests(message));
      return;
    }
    next();
  };
}
