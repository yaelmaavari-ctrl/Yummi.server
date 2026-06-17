import Joi from 'joi';
import { OrderType } from '../types';

/**
 * Order validation schemas (Joi). Owner: Developer B.
 * Use with the `validate` middleware in routes/order.routes.ts.
 */
export const placeOrderSchema = Joi.object({
  orderType: Joi.string()
    .valid(...Object.values(OrderType))
    .default(OrderType.PICKUP),
});

export const cancelOrderSchema = Joi.object({});
