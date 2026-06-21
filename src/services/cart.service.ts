import { Cart, ICart } from '../models/cart.model';
import { ApiError } from '../utils/ApiError';

/**
 * Cart service - business logic. Owner: Developer B.
 * Reads/writes the Cart model.
 */
export const cartService = {
  /**
   * Returns the logged-in user's cart, creating an empty one if it does not exist yet.
   */
  async getCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return cart;
  },

  /**
   * Adds a product to the user's cart. If the product is already present,
   * its quantity is increased; otherwise it is added as a new item.
   * Creates the cart on first use (one cart per user).
   */
  async addItem(userId: string, productId: string, quantity = 1): Promise<ICart> {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find((item) => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity } as unknown as ICart['items'][number]);
    }

    await cart.save();
    return cart;
  },

  /**
   * Sets the quantity of an existing cart item identified by productId.
   */
  async updateItem(userId: string, productId: string, quantity: number): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    const item = cart.items.find((entry) => entry.productId.toString() === productId);
    if (!item) {
      throw ApiError.notFound('Product not found in cart');
    }

    item.quantity = quantity;
    await cart.save();
    return cart;
  },

  /**
   * Removes the item matching productId from the user's cart.
   */
  async removeItem(userId: string, productId: string): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((entry) => entry.productId.toString() !== productId);

    if (cart.items.length === initialLength) {
      throw ApiError.notFound('Product not found in cart');
    }

    await cart.save();
    return cart;
  },

  /**
   * Empties all items from the user's cart. Used after order creation.
   */
  async clearCart(userId: string): Promise<void> {
    await Cart.findOneAndUpdate({ userId }, { items: [] });
  },
};
