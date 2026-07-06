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
  useDefaultAddress: Joi.when('orderType', {
    is: OrderType.DELIVERY,
    then: Joi.boolean().default(false),
    otherwise: Joi.forbidden(),
  }),
  deliveryCity: Joi.when('orderType', {
    is: OrderType.DELIVERY,
    then: Joi.when('useDefaultAddress', {
      is: true,
      then: Joi.forbidden(),
      otherwise: Joi.string().trim().min(2).max(100).required(),
    }),
    otherwise: Joi.forbidden(),
  }),
  deliveryAddress: Joi.when('orderType', {
    is: OrderType.DELIVERY,
    then: Joi.when('useDefaultAddress', {
      is: true,
      then: Joi.forbidden(),
      otherwise: Joi.string().trim().min(2).max(500).required(),
    }),
    otherwise: Joi.forbidden(),
  }),
});

export const orderIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .required(),
});

export const listOrdersQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(OrderStatus)),
  sort: Joi.string().valid('latest', 'oldest').default('latest'),
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required(),
});
