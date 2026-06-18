import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationIdParamsSchema } from '../validations/notification.validation';

const router = Router();

/**
 * Notification routes. Owner: Developer B.
 */
router.get('/', authenticate, notificationController.listMine);
router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamsSchema, 'params'),
  notificationController.markAsRead
);

export default router;
