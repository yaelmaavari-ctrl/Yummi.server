import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { asyncHandler } from '../utils/asyncHandler';

const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.create(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: { review } });
});

const list = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await reviewService.list();
  res.status(200).json({ success: true, data: { reviews } });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.getById(
    req.params['id'] as string,
    req.user!.userId,
    req.user!.activeRole
  );
  res.status(200).json({ success: true, data: { review } });
});

export const reviewController = {
  create,
  list,
  getById,
};
