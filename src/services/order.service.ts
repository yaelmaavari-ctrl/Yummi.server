import { Cart } from '../models/cart.model';
import { Order, IOrder } from '../models/order.model';
import { OrderStatus, OrderType, UserRole } from '../types';
import { ApiError } from '../utils/ApiError';
import { cartService } from './cart.service';

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

interface ListOrdersOptions {
  userId: string;
  activeRole: UserRole;
  status?: OrderStatus;
  sort?: 'latest' | 'oldest';
}

/**
 * Order service - business logic. Owner: Developer B.
 * Reads/writes the Order model.
 */
export const orderService = {
  /**
   * Lists orders. Admins see all orders; other users see only their own.
   */
  async listOrders({
    userId,
    activeRole,
    status,
    sort = 'latest',
  }: ListOrdersOptions): Promise<IOrder[]> {
    const filter: Record<string, unknown> = {};

    if (activeRole !== UserRole.ADMIN) {
      filter.userId = userId;
    }

    if (status) {
      filter.status = status;
    }

    return Order.find(filter).sort({ createdAt: sort === 'oldest' ? 1 : -1 });
  },

  /**
   * Creates an order from the authenticated user's current cart.
   * Snapshots product name/price at purchase time, then clears the cart.
   */
  async createFromCart(userId: string, orderType: OrderType = OrderType.PICKUP): Promise<IOrder> {
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
        productId: product._id,
        name,
        price,
        quantity,
        totalPrice: parseFloat((price * quantity).toFixed(2)),
      };
    });

    const subtotal = parseFloat(
      orderItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );

    const order = await Order.create({
      userId,
      items: orderItems,
      subtotal,
      total: subtotal,
      orderType,
    });

    await cartService.clearCart(userId);

    return order;
  },
};
