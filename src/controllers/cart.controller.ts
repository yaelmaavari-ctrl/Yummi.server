import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

/**
 * Cart controller. Owner: Developer B.
 * Thin handlers that delegate to cartService.
 */
export const cartController = {
  getCart: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const cart = await cartService.getCart(req.user.userId);

    res.status(200).json({ success: true, data: cart });
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { productId, quantity } = req.body;
    const cart = await cartService.addItem(req.user.userId, productId, quantity);

    res.status(200).json({ success: true, data: cart });
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { productId } = req.params as { productId: string };
    const { quantity } = req.body;
    const cart = await cartService.updateItem(req.user.userId, productId, quantity);

    res.status(200).json({ success: true, data: cart });
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { productId } = req.params as { productId: string };
    const cart = await cartService.removeItem(req.user.userId, productId);

    res.status(200).json({ success: true, data: cart });
  }),
};
