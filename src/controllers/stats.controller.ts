import { Request, Response } from 'express';
import { statsService } from '../services/stats.service';
import { asyncHandler } from '../utils/asyncHandler';

const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await statsService.getDashboard();
  res.status(200).json({ success: true, data: { stats } });
});

export const statsController = {
  getDashboard,
};
