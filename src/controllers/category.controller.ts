import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { productService } from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '../types';

const list = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.list();
  res.status(200).json({ success: true, data: { categories } });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getById(req.params['id'] as string);
  res.status(200).json({ success: true, data: { category } });
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.create(req.body);
  res.status(201).json({ success: true, data: { category } });
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.update(req.params['id'] as string, req.body);
  res.status(200).json({ success: true, data: { category } });
});

const softDelete = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.softDelete(req.params['id'] as string);
  res.status(200).json({ success: true, data: { category } });
});

const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const includeUnavailable =
    req.user!.activeRole === UserRole.ADMIN || req.user!.activeRole === UserRole.KITCHEN;

  const products = await productService.listByCategory(req.params['id'] as string, {
    includeUnavailable,
  });

  res.status(200).json({ success: true, data: { products } });
});

export const categoryController = {
  list,
  getById,
  create,
  update,
  softDelete,
  listProducts,
};
