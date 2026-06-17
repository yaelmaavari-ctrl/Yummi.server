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
  listOrders: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { status, sort } = req.query as {
      status?: OrderStatus;
      sort?: 'latest' | 'oldest';
    };

    const orders = await orderService.listOrders({
      userId: req.user.userId,
      activeRole: req.user.activeRole,
      status,
      sort,
    });

    res.status(200).json({ success: true, data: orders });
  }),

  listKitchenOrders: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const orders = await orderService.listKitchenOrders();

    res.status(200).json({ success: true, data: orders });
  }),

  createOrder: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { orderType } = req.body as { orderType: OrderType };
    const order = await orderService.createFromCart(req.user.userId, orderType);

    res.status(201).json({ success: true, data: order });
  }),
};
