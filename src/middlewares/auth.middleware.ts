import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

/**
 * Verifies the Bearer JWT and attaches the authenticated identity
 * (`userId` + `activeRole`) to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token is missing'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, activeRole: payload.activeRole };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}
