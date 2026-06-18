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

export const orderIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .required(),
});

export const cancelOrderSchema = Joi.object({});
