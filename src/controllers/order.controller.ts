import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { OrderStatus, OrderType } from '../types';

function assertAuthenticated(req: Request): asserts req is Request & { user: NonNullable<Request['user']> } {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
}

function assertEmployee(req: Request): void {
  assertAuthenticated(req);
  if (req.user.activeRole !== 'KITCHEN') {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
}

/**
 * Order controller. Owner: Developer B.
 * Thin handlers that delegate to orderService.
 */
export const orderController = {
  getAllOrders: asyncHandler(async (req: Request, res: Response) => {
    assertEmployee(req);

    const orders = await orderService.getAllOrders();

    res.status(200).json({ success: true, data: orders });
  }),

  getMyOrders: asyncHandler(async (req: Request, res: Response) => {
    assertAuthenticated(req);

    const orders = await orderService.getOrdersByUser(req.user.userId);

    res.status(200).json({ success: true, data: orders });
  }),

  getKitchenOrders: asyncHandler(async (req: Request, res: Response) => {
    assertEmployee(req);

    const orders = await orderService.getKitchenOrders();

    res.status(200).json({ success: true, data: orders });
  }),

  updateOrderStatus: asyncHandler(async (req: Request, res: Response) => {
    assertEmployee(req);

    const { id } = req.params as { id: string };
    const { status } = req.body as { status: OrderStatus };
    const order = await orderService.updateOrderStatus(id, status);

    res.status(200).json({ success: true, data: order });
  }),

  createOrder: asyncHandler(async (req: Request, res: Response) => {
    assertAuthenticated(req);

    const { orderType } = req.body as { orderType: OrderType };
    const order = await orderService.createFromCart(req.user.userId, orderType);

    res.status(201).json({ success: true, data: order });
  }),
};
