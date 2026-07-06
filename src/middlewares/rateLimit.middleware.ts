import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

interface RateLimitOptions {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per key within the window. */
  max: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory, per-identity rate limiter.
 *
 * Intended for protecting expensive endpoints (e.g. the AI agent) from abuse
 * and runaway cost. Keys on the authenticated userId when present, otherwise
 * the request IP. For multi-instance deployments swap this for a shared store
 * (e.g. Redis); the interface stays the same.
 */
export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, WindowState>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.user?.userId ?? req.ip ?? 'anonymous';
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (existing.count >= options.max) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      return next(new ApiError(429, `Too many requests. Please try again in ${retryAfterSec}s.`));
    }

    existing.count += 1;
    return next();
  };
}
