import { Types } from 'mongoose';
import { Cart, ICart, ICartItem } from '../models/cart.model';
import { Product, IProduct } from '../models/product.model';
import { Ingredient } from '../models/ingredient.model';
import { ApiError } from '../utils/ApiError';
import { IngredientStatus } from '../types';

export interface AddCartItemInput {
  productId: string;
  quantity?: number;
  selectedExtras?: string[];
}

export interface UpdateCartItemInput {
  quantity: number;
  selectedExtras?: string[];
}

/** Normalizes add-on ids for stable comparison (unique + sorted). */
function normalizeExtraIds(extraIds: string[]): string[] {
  return [...new Set(extraIds.map((id) => id.trim()))].sort();
}

function extrasKey(extraIds: Types.ObjectId[] | string[]): string {
  const normalized = extraIds.map((id) => id.toString()).sort();
  return normalized.join(',');
}

function findCartItemIndex(
  items: ICartItem[],
  productId: string,
  selectedExtraIds: string[]
): number {
  const key = extrasKey(selectedExtraIds);
  return items.findIndex(
    (item) => item.productId.toString() === productId && extrasKey(item.selectedExtras) === key
  );
}

async function validateProductAndExtras(
  productId: string,
  selectedExtraIds: string[]
): Promise<{ product: IProduct; extras: Types.ObjectId[] }> {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isAvailable: true,
  });

  if (!product) {
    throw ApiError.notFound('Product not found or unavailable');
  }

  const normalized = normalizeExtraIds(selectedExtraIds);

  if (normalized.length === 0) {
    return { product, extras: [] };
  }

  if (product.allowedExtras.length === 0) {
    throw ApiError.badRequest('This product does not support add-ons');
  }

  const allowedSet = new Set(product.allowedExtras.map((id) => id.toString()));
  for (const id of normalized) {
    if (!allowedSet.has(id)) {
      throw ApiError.badRequest('One or more selected add-ons are not allowed for this product');
    }
  }

  const ingredients = await Ingredient.find({ _id: { $in: normalized } });
  if (ingredients.length !== normalized.length) {
    throw ApiError.badRequest('One or more add-ons not found');
  }

  for (const ingredient of ingredients) {
    if (ingredient.status !== IngredientStatus.AVAILABLE) {
      throw ApiError.badRequest(`Add-on "${ingredient.name}" is temporarily unavailable`);
    }
  }

  return { product, extras: normalized.map((id) => new Types.ObjectId(id)) };
}

async function populateCart(cart: ICart): Promise<ICart> {
  await cart.populate([{ path: 'items.productId' }, { path: 'items.selectedExtras' }]);
  return cart;
}

/**
 * Cart service - business logic. Owner: Developer B.
 * Validates add-ons against each product's allowedExtras and pricing config.
 */
export const cartService = {
  /**
   * Returns the logged-in user's cart, creating an empty one if it does not exist yet.
   */
  async getCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return populateCart(cart);
  },

  /**
   * Adds a product (with optional add-ons) to the cart.
   * Merges quantity when the same product and add-on combination already exists.
   */
  async addItem(userId: string, input: AddCartItemInput): Promise<ICart> {
    const quantity = input.quantity ?? 1;
    const selectedExtraIds = input.selectedExtras ?? [];

    const { extras } = await validateProductAndExtras(input.productId, selectedExtraIds);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingIndex = findCartItemIndex(cart.items, input.productId, selectedExtraIds);

    if (existingIndex !== -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(input.productId),
        quantity,
        selectedExtras: extras,
      });
    }

    await cart.save();
    return populateCart(cart);
  },

  /**
   * Updates quantity for a cart line identified by productId + selectedExtras.
   */
  async updateItem(userId: string, productId: string, input: UpdateCartItemInput): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    const selectedExtraIds = input.selectedExtras ?? [];
    const itemIndex = findCartItemIndex(cart.items, productId, selectedExtraIds);
    if (itemIndex === -1) {
      throw ApiError.notFound('Product not found in cart');
    }

    cart.items[itemIndex].quantity = input.quantity;
    await cart.save();
    return populateCart(cart);
  },

  /**
   * Removes a cart line identified by productId + selectedExtras.
   */
  async removeItem(
    userId: string,
    productId: string,
    selectedExtraIds: string[] = []
  ): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    const itemIndex = findCartItemIndex(cart.items, productId, selectedExtraIds);
    if (itemIndex === -1) {
      throw ApiError.notFound('Product not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();
    return populateCart(cart);
  },

  /**
   * Empties all items from the user's cart. Used after order creation.
   */
  async clearCart(userId: string): Promise<void> {
    await Cart.findOneAndUpdate({ userId }, { items: [] });
  },
};
