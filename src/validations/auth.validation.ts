import Joi from 'joi';

/**
 * Auth validation schemas (Joi). Owner: Developer A.
 * Use with the `validate` middleware in routes/auth.routes.ts.
 *
 * TODO: define real rules (e.g. registerSchema, loginSchema, switchRoleSchema).
 */
export const registerSchema = Joi.object({});
export const loginSchema = Joi.object({});
