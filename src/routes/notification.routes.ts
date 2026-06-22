import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationIdParamsSchema } from '../validations/notification.validation';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.listMine);
router.patch(
  '/:id/read',
  validate(notificationIdParamsSchema, 'params'),
  notificationController.markAsRead
);

export default router;
