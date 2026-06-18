import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { asyncHandler } from '../utils/asyncHandler';

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

export const categoryController = {
  list,
  getById,
  create,
  update,
  softDelete,
};
