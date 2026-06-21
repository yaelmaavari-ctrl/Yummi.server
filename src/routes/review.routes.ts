import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createReviewSchema, reviewIdParamSchema } from '../validations/review.validation';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.CUSTOMER),
  validate(createReviewSchema),
  reviewController.create
);

router.get('/', authorize(UserRole.ADMIN), reviewController.list);

router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.CUSTOMER),
  validate(reviewIdParamSchema, 'params'),
  reviewController.getById
);

export default router;
