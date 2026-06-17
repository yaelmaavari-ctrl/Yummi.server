import Joi from 'joi';
import { OrderStatus, OrderType } from '../types';

/**
 * Order validation schemas (Joi). Owner: Developer B.
 * Use with the `validate` middleware in routes/order.routes.ts.
 */
export const placeOrderSchema = Joi.object({
  orderType: Joi.string()
    .valid(...Object.values(OrderType))
    .default(OrderType.PICKUP),
});

export const listOrdersQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(OrderStatus)),
  sort: Joi.string().valid('latest', 'oldest').default('latest'),
});

export const cancelOrderSchema = Joi.object({});
