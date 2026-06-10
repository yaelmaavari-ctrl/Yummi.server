import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { isProduction } from '../config/env';

/**
 * Catch-all for unmatched routes. Forwards a 404 to the error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler. Converts thrown errors into a consistent JSON
 * shape and hides stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
