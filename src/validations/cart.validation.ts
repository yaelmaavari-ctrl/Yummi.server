import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

/**
 * Cart validation schemas (Joi). Owner: Developer B.
 * Use with the `validate` middleware in routes/cart.routes.ts.
 */
export const addItemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
  selectedExtras: Joi.array().items(objectId).unique().default([]),
});

export const updateItemParamsSchema = Joi.object({
  productId: objectId.required(),
});

export const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
  /** Identifies the line when the same product appears with different add-ons. */
  selectedExtras: Joi.array().items(objectId).unique().default([]),
});

/** Query params for DELETE — disambiguates lines with the same productId. */
export const removeItemQuerySchema = Joi.object({
  selectedExtras: Joi.alternatives()
    .try(Joi.array().items(objectId).unique(), objectId)
    .optional()
    .default([]),
});
