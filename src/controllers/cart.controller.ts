import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';

const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.userId);
  res.status(200).json({ success: true, data: { cart } });
});

const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, selectedExtras } = req.body;
  const cart = await cartService.addItem(req.user!.userId, {
    productId,
    quantity,
    selectedExtras,
  });
  res.status(200).json({ success: true, data: { cart } });
});

const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, selectedExtras } = req.body;
  const cart = await cartService.updateItem(req.user!.userId, req.params['productId'] as string, {
    quantity,
    selectedExtras,
  });
  res.status(200).json({ success: true, data: { cart } });
});

const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const { selectedExtras = [] } = req.query as { selectedExtras?: string[] };
  const cart = await cartService.removeItem(
    req.user!.userId,
    req.params['productId'] as string,
    selectedExtras
  );
  res.status(200).json({ success: true, data: { cart } });
});

export const cartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
};
