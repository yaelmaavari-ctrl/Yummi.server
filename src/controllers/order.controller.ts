import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { orderService } from '../services/order.service';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { OrderStatus, OrderType } from '../types';
import { emitOrderCreated } from '../sockets/orderNotifications';

const getAllOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await orderService.getAllOrders();
  res.status(200).json({ success: true, data: { orders } });
});

const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.getOrdersByUser(req.user!.userId);
  res.status(200).json({ success: true, data: { orders } });
});

const getKitchenOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await orderService.getKitchenOrders();
  res.status(200).json({ success: true, data: { orders } });
});

const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: OrderStatus };
  const order = await orderService.updateOrderStatus(req.params['id'] as string, status);
  res.status(200).json({ success: true, data: { order } });
});

const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderType, deliveryAddress, deliveryCity } = req.body as {
    orderType?: OrderType;
    deliveryAddress?: string;
    deliveryCity?: string;
  };
  const order = await orderService.createFromCart(req.user!.userId, {
    orderType,
    deliveryAddress,
    deliveryCity,
  });

  const ownerId = req.user!.userId;
  const orderId = (order._id as Types.ObjectId).toString();

  emitOrderCreated(ownerId, order);
  await notificationService.create({
    recipientId: ownerId,
    type: 'ORDER_CREATED',
    message: 'Your order has been received',
    orderId,
  });

  res.status(201).json({ success: true, data: { order } });
});

const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  const order = await orderService.cancelOrder(
    req.user!.userId,
    req.params['id'] as string,
    reason
  );
  res.status(200).json({ success: true, data: { order } });
});

export const orderController = {
  getAllOrders,
  getMyOrders,
  getKitchenOrders,
  updateOrderStatus,
  createOrder,
  cancelOrder,
};
