import Joi from 'joi';

/**
 * Cart validation schemas (Joi). Owner: Developer B.
 * Use with the `validate` middleware in routes/cart.routes.ts.
 */
export const addItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).default(1),
});

export const updateItemParamsSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
});

export const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});
