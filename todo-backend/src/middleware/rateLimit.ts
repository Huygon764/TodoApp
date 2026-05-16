import type { Request, Response, NextFunction } from "express";
import { tooManyRequests } from "../utils/index.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
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
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
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
