import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { OrderStatus, OrderType } from '../types';

/**
 * Order controller. Owner: Developer B.
 * Thin handlers that delegate to orderService.
 */
export const orderController = {
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { orderType } = req.body as { orderType: OrderType };
    const order = await orderService.createFromCart(req.user.userId, orderType);

    res.status(201).json({ success: true, data: order });
  }),

  updateOrderStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { orderId } = req.params as { orderId: string };
    const { status } = req.body as { status: OrderStatus };
    const order = await orderService.updateStatus(orderId, status);

    res.status(200).json({ success: true, data: order });
  }),
};
