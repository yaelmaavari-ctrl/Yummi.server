import { Types } from 'mongoose';
import { Cart } from '../models/cart.model';
import { Order, IOrder } from '../models/order.model';
import { OrderStatus, OrderType } from '../types';
import { ApiError } from '../utils/ApiError';
import { cartService } from './cart.service';
import { notificationService } from './notification.service';
import { emitEvent, Rooms, SocketEvents, SocketEvent } from '../sockets/events';

/**
 * Shape expected from a populated Product document.
 * Developer A owns the Product model; once they add name/price these fields
 * will resolve naturally. The cast below keeps TypeScript happy in the meantime.
 */
interface PopulatedProduct {
  _id: unknown;
  name?: string;
  price?: number;
  isAvailable: boolean;
  isDeleted: boolean;
}

const KITCHEN_STATUSES: OrderStatus[] = [
  OrderStatus.RECEIVED,
  OrderStatus.APPROVED,
  OrderStatus.IN_PREPARATION,
];

/** Allowed status transitions in the order lifecycle. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.RECEIVED]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.APPROVED]: [OrderStatus.IN_PREPARATION],
  [OrderStatus.IN_PREPARATION]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Maps each order status to its corresponding Socket.IO event name. */
const STATUS_TO_SOCKET_EVENT: Partial<Record<OrderStatus, SocketEvent>> = {
  [OrderStatus.APPROVED]: SocketEvents.ORDER_APPROVED,
  [OrderStatus.IN_PREPARATION]: SocketEvents.ORDER_IN_PREPARATION,
  [OrderStatus.READY]: SocketEvents.ORDER_READY,
  [OrderStatus.COMPLETED]: SocketEvents.ORDER_COMPLETED,
  [OrderStatus.CANCELLED]: SocketEvents.ORDER_CANCELLED,
};

/**
 * Order service - business logic. Owner: Developer B.
 * Reads/writes the Order model.
 */
export const orderService = {
  /**
   * Returns all orders (employee-only at controller layer).
   */
  async getAllOrders(): Promise<IOrder[]> {
    return Order.find().sort({ createdAt: -1 });
  },

  /**
   * Returns orders belonging to a single user.
   */
  async getOrdersByUser(userId: string): Promise<IOrder[]> {
    return Order.find({ userId }).sort({ createdAt: -1 });
  },

  /**
   * Kitchen queue: active orders awaiting preparation, oldest first (FIFO).
   */
  async getKitchenOrders(): Promise<IOrder[]> {
    return Order.find({ status: { $in: KITCHEN_STATUSES } }).sort({ createdAt: 1 });
  },

  /**
   * Updates order status after validating the lifecycle transition.
   * Emits the status-specific socket event to Rooms.user(userId) after each save.
   * When status reaches READY, also creates and emits a persisted notification.
   * When status reaches IN_PREPARATION for a DELIVERY order, recalculates
   * estimatedDeliveryTime and emits ORDER_ESTIMATED_TIME_UPDATED.
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const allowedNext = ALLOWED_TRANSITIONS[order.status];
    if (!allowedNext.includes(status)) {
      throw ApiError.badRequest(
        `Invalid status transition from ${order.status} to ${status}`
      );
    }

    order.status = status;
    await order.save();

    const userRoom = Rooms.user((order.userId as Types.ObjectId).toString());

    // Emit the canonical status-specific event
    const socketEvent = STATUS_TO_SOCKET_EVENT[status];
    if (socketEvent) {
      emitEvent(socketEvent, order, userRoom);
    }

    // Recalculate estimated delivery time when kitchen starts preparing a delivery order
    if (status === OrderStatus.IN_PREPARATION && order.deliveryType === 'DELIVERY') {
      order.estimatedDeliveryTime = new Date(
        Date.now() + 30 * 60 * 1000 + Math.random() * 30 * 60 * 1000
      );
      await order.save();
      emitEvent(SocketEvents.ORDER_ESTIMATED_TIME_UPDATED, order, userRoom);
    }

    // Persist + emit a notification for every status change; READY is highlighted
    const message =
      status === OrderStatus.READY
        ? 'Your order is ready'
        : `Your order status has been updated to ${status}`;

    await notificationService.create({
      recipientId: (order.userId as Types.ObjectId).toString(),
      type: status === OrderStatus.READY ? 'ORDER_READY' : 'ORDER_STATUS_UPDATED',
      message,
      orderId,
    });

    return order;
  },

  /**
   * Creates an order from the authenticated user's current cart.
   * Snapshots product name/price at purchase time, then clears the cart.
   */
  async createFromCart(
    userId: string,
    orderType: OrderType = OrderType.PICKUP,
    deliveryType: 'PICKUP' | 'DELIVERY' = 'PICKUP',
    deliveryAddress?: string
  ): Promise<IOrder> {
    const cart = await Cart.findOne({ userId }).populate<{
      items: { productId: PopulatedProduct; quantity: number }[];
    }>('items.productId');

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    const orderItems = cart.items.map(({ productId: product, quantity }) => {
      const name = product.name ?? 'Unknown product';
      const price = product.price ?? 0;
      return {
        productId: product._id as Types.ObjectId,
        name,
        price,
        quantity,
        totalPrice: parseFloat((price * quantity).toFixed(2)),
      };
    });

    const subtotal = parseFloat(
      orderItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );

    const estimatedDeliveryTime =
      deliveryType === 'DELIVERY'
        ? new Date(Date.now() + 30 * 60 * 1000 + Math.random() * 30 * 60 * 1000)
        : undefined;

    const order = await Order.create({
      userId,
      items: orderItems,
      subtotal,
      total: subtotal,
      orderType,
      deliveryType,
      deliveryAddress,
      estimatedDeliveryTime,
    });

    await cartService.clearCart(userId);

    return order;
  },
};
