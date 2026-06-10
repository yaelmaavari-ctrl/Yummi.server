import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { ApiError } from '../utils/ApiError';

/**
 * Guards a route so only the allowed roles may access it.
 * Authorization is based on the session's `activeRole` (from the JWT),
 * not on every role the user owns. Use after {@link authenticate}.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.activeRole)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}
