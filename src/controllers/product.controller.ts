import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { emitEvent, SocketEvents } from '../sockets/events';
import { UserRole } from '../types';

const list = asyncHandler(async (req: Request, res: Response) => {
  const includeUnavailable =
    req.user!.activeRole === UserRole.ADMIN || req.user!.activeRole === UserRole.KITCHEN;
  const includeIngredientDetails = includeUnavailable;

  const products = await productService.list({
    search: req.query['search'] as string | undefined,
    categoryId: req.query['categoryId'] as string | undefined,
    includeUnavailable,
    includeIngredientDetails,
  });

  res.status(200).json({ success: true, data: { products } });
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.create(req.body);
  res.status(201).json({ success: true, data: { product } });
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.update(req.params['id'] as string, req.body);
  res.status(200).json({ success: true, data: { product } });
});

const setAvailability = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.setAvailability(
    req.params['id'] as string,
    req.body.isAvailable as boolean
  );

  emitEvent(SocketEvents.PRODUCT_AVAILABILITY_CHANGED, {
    productId: product.id,
    isAvailable: product.isAvailable,
    categoryIds: product.categories,
  });

  res.status(200).json({ success: true, data: { product } });
});

const softDelete = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.softDelete(req.params['id'] as string);
  res.status(200).json({ success: true, data: { product } });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const includeUnavailable =
    req.user!.activeRole === UserRole.ADMIN || req.user!.activeRole === UserRole.KITCHEN;
  const includeIngredientDetails = includeUnavailable;

  const product = await productService.getById(req.params['id'] as string, {
    includeUnavailable,
    includeIngredientDetails,
  });
  res.status(200).json({ success: true, data: { product } });
});

export const productController = {
  list,
  create,
  update,
  setAvailability,
  softDelete,
  getById,
};
