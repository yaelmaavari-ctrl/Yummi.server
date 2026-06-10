import Joi from 'joi';

/**
 * Order validation schemas (Joi). Owner: Developer B.
 *
 * TODO: define placeOrderSchema (orderType, address/zone, payment), cancelOrderSchema
 * (mandatory reason), and updateStatusSchema rules.
 */
export const placeOrderSchema = Joi.object({});
export const cancelOrderSchema = Joi.object({});
