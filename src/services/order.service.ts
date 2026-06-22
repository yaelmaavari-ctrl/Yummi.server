import { Types } from 'mongoose';
import { Cart } from '../models/cart.model';
import { Order, IOrder, IOrderExtraSnapshot } from '../models/order.model';
import { OrderStatus, OrderType } from '../types';
import { ApiError } from '../utils/ApiError';
import { cartService } from './cart.service';
import { notificationService } from './notification.service';
import { businessHoursService } from './businessHours.service';
import { deliveryZoneService } from './deliveryZone.service';
import { emitEvent, Rooms, SocketEvents, SocketEvent } from '../sockets/events';
import { computeExtraUnitPrices, computeLineTotal } from '../utils/extrasPricing';

interface PopulatedProduct {
  _id: Types.ObjectId;
  name?: string;
  price?: number;
  freeExtrasCount?: number;
  pricePerExtra?: number;
  isAvailable: boolean;
  isDeleted: boolean;
}

interface PopulatedIngredient {
  _id: Types.ObjectId;
  name: string;
}

interface PopulatedCartItem {
  productId: PopulatedProduct;
  quantity: number;
  selectedExtras: PopulatedIngredient[];
}

function buildExtraSnapshots(
  extras: PopulatedIngredient[],
  freeExtrasCount: number,
  pricePerExtra: number
): IOrderExtraSnapshot[] {
  const sorted = [...extras].sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
  const prices = computeExtraUnitPrices(sorted.length, freeExtrasCount, pricePerExtra);

  return sorted.map((extra, index) => ({
    ingredientId: extra._id,
    name: extra.name,
    price: prices[index] ?? 0,
  }));
}

export interface CreateOrderInput {
  orderType?: OrderType;
  deliveryAddress?: string;
  deliveryCity?: string;
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
      throw ApiError.badRequest(`Invalid status transition from ${order.status} to ${status}`);
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
    if (
      status === OrderStatus.IN_PREPARATION &&
      order.orderType === OrderType.DELIVERY &&
      order.estimatedDeliveryMinutes
    ) {
      order.estimatedDeliveryTime = new Date(
        Date.now() + order.estimatedDeliveryMinutes * 60 * 1000
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
   *
   * Enforces business rules:
   * - Orders cannot be placed while the business is closed.
   * - DELIVERY orders require a supported city (active delivery zone) and an address.
   *   The zone's delivery fee and ETA are applied to the order.
   */
  async createFromCart(userId: string, input: CreateOrderInput = {}): Promise<IOrder> {
    const orderType = input.orderType ?? OrderType.PICKUP;

    const openStatus = await businessHoursService.isOpenNow();
    if (!openStatus.isOpen) {
      throw ApiError.badRequest(`The restaurant is currently closed. ${openStatus.reason}`);
    }

    const cart = await Cart.findOne({ userId }).populate<{
      items: PopulatedCartItem[];
    }>([{ path: 'items.productId' }, { path: 'items.selectedExtras' }]);

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    const orderItems = cart.items.map(({ productId: product, quantity, selectedExtras }) => {
      const name = product.name ?? 'Unknown product';
      const price = product.price ?? 0;
      const freeExtrasCount = product.freeExtrasCount ?? 0;
      const pricePerExtra = product.pricePerExtra ?? 0;
      const extras = (selectedExtras ?? []) as PopulatedIngredient[];
      const extraSnapshots = buildExtraSnapshots(extras, freeExtrasCount, pricePerExtra);

      return {
        productId: product._id,
        name,
        price,
        quantity,
        selectedExtras: extraSnapshots,
        totalPrice: computeLineTotal(
          price,
          extras.length,
          quantity,
          freeExtrasCount,
          pricePerExtra
        ),
      };
    });

    const subtotal = parseFloat(
      orderItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );

    let deliveryFee = 0;
    let deliveryCity: string | undefined;
    let estimatedDeliveryMinutes: number | undefined;
    let estimatedDeliveryTime: Date | undefined;

    if (orderType === OrderType.DELIVERY) {
      if (!input.deliveryCity || !input.deliveryAddress) {
        throw ApiError.badRequest('Delivery orders require a delivery city and address');
      }

      // Throws 404 if the city is not supported (no active delivery zone).
      const zone = await deliveryZoneService.checkCity(input.deliveryCity);
      deliveryFee = zone.deliveryPrice;
      deliveryCity = zone.city;
      estimatedDeliveryMinutes = zone.estimatedDeliveryMinutes;
      estimatedDeliveryTime = new Date(Date.now() + estimatedDeliveryMinutes * 60 * 1000);
    }

    const total = parseFloat((subtotal + deliveryFee).toFixed(2));

    const order = await Order.create({
      userId,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      orderType,
      deliveryAddress: orderType === OrderType.DELIVERY ? input.deliveryAddress : undefined,
      deliveryCity,
      estimatedDeliveryMinutes,
      estimatedDeliveryTime,
    });

    await cartService.clearCart(userId);

    return order;
  },

  /**
   * Cancels an order on behalf of its owner.
   * Per business rules, a customer may cancel only while the order is still
   * RECEIVED, and a cancellation reason is mandatory.
   */
  async cancelOrder(userId: string, orderId: string, reason: string): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if ((order.userId as Types.ObjectId).toString() !== userId) {
      throw ApiError.forbidden('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.RECEIVED) {
      throw ApiError.badRequest('Orders can only be cancelled while their status is RECEIVED');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    const userRoom = Rooms.user(userId);
    emitEvent(SocketEvents.ORDER_CANCELLED, order, userRoom);

    await notificationService.create({
      recipientId: userId,
      type: 'ORDER_CANCELLED',
      message: 'Your order has been cancelled',
      orderId,
    });

    return order;
  },
};
