import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { orderService } from '../services/order.service';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { OrderStatus, OrderType } from '../types';
import { emitOrderCreated } from '../sockets/orderNotifications';

function assertAuthenticated(
  req: Request
): asserts req is Request & { user: NonNullable<Request['user']> } {
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

    // Socket emits and notification persistence happen inside the service,
    // after order.save(), so this handler stays thin.
    const order = await orderService.updateOrderStatus(id, status);

    res.status(200).json({ success: true, data: order });
  }),

  createOrder: asyncHandler(async (req: Request, res: Response) => {
    assertAuthenticated(req);

    const { orderType, deliveryType, deliveryAddress } = req.body as {
      orderType: OrderType;
      deliveryType?: 'PICKUP' | 'DELIVERY';
      deliveryAddress?: string;
    };
    const order = await orderService.createFromCart(
      req.user.userId,
      orderType,
      deliveryType,
      deliveryAddress
    );

    const ownerId = req.user.userId;
    const orderId = (order._id as Types.ObjectId).toString();

    emitOrderCreated(ownerId, order);
    await notificationService.create({
      recipientId: ownerId,
      type: 'ORDER_CREATED',
      message: 'Your order has been received',
      orderId,
    });

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
