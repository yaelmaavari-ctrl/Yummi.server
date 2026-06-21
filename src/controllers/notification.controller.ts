import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

/**
 * Notification controller. Owner: Developer B.
 */
export const notificationController = {
  listMine: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const notifications = await notificationService.listMine(req.user.userId);

    res.status(200).json({ success: true, data: notifications });
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { id } = req.params as { id: string };
    const notification = await notificationService.markAsRead(req.user.userId, id);

    res.status(200).json({ success: true, data: notification });
  }),
};
