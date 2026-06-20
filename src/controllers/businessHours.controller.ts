import { Request, Response } from 'express';
import { businessHoursService } from '../services/businessHours.service';
import { asyncHandler } from '../utils/asyncHandler';

const get = asyncHandler(async (_req: Request, res: Response) => {
  const businessHours = await businessHoursService.get();
  res.status(200).json({ success: true, data: { businessHours } });
});

const isOpenNow = asyncHandler(async (_req: Request, res: Response) => {
  const result = await businessHoursService.isOpenNow();
  res.status(200).json({ success: true, data: result });
});

const updateWeeklySchedule = asyncHandler(async (req: Request, res: Response) => {
  const businessHours = await businessHoursService.updateWeeklySchedule(req.body.weeklySchedule);
  res.status(200).json({ success: true, data: { businessHours } });
});

const addSpecialDay = asyncHandler(async (req: Request, res: Response) => {
  const businessHours = await businessHoursService.addSpecialDay(req.body);
  res.status(200).json({ success: true, data: { businessHours } });
});

const removeSpecialDay = asyncHandler(async (req: Request, res: Response) => {
  const businessHours = await businessHoursService.removeSpecialDay(req.params['date'] as string);
  res.status(200).json({ success: true, data: { businessHours } });
});

export const businessHoursController = {
  get,
  isOpenNow,
  updateWeeklySchedule,
  addSpecialDay,
  removeSpecialDay,
};
