import Joi from 'joi';

/**
 * Notification validation schemas (Joi). Owner: Developer B.
 */
export const notificationIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const markAsReadSchema = Joi.object({});
