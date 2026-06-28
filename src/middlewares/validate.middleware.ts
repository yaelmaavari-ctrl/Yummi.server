import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { ApiError } from '../utils/ApiError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Express 5 makes req.body, req.query, and req.params read-only, so validated
 * values are merged onto the existing object instead of replacing it.
 */
function applyValidatedPart(req: Request, part: RequestPart, value: unknown): void {
  const target = req[part] as Record<string, unknown>;
  const source = (value ?? {}) as Record<string, unknown>;

  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      delete target[key];
    }
  }

  Object.assign(target, source);
}

/**
 * Builds a middleware that validates a part of the request against a Joi
 * schema. On success the parsed/validated value replaces the original.
 */
export function validate(schema: ObjectSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[part], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      return next(ApiError.badRequest('Validation failed', details));
    }

    applyValidatedPart(req, part, value);
    return next();
  };
}
