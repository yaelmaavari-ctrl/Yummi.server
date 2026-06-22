import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

const listMine = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await notificationService.listMine(req.user!.userId);
  res.status(200).json({ success: true, data: { notifications } });
});

const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(
    req.user!.userId,
    req.params['id'] as string
  );
  res.status(200).json({ success: true, data: { notification } });
});

export const notificationController = {
  listMine,
  markAsRead,
};
