import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  setAvailabilitySchema,
  productIdParamSchema,
} from '../validations/product.validation';
import { UserRole } from '../types';

const router = Router();

const catalogViewRoles = [UserRole.CUSTOMER, UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createProductSchema),
  productController.create
);

router.patch(
  '/:id/availability',
  authorize(UserRole.ADMIN, UserRole.KITCHEN),
  validate(productIdParamSchema, 'params'),
  validate(setAvailabilitySchema),
  productController.setAvailability
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  productController.update
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(productIdParamSchema, 'params'),
  productController.softDelete
);

router.get(
  '/:id',
  authorize(...catalogViewRoles),
  validate(productIdParamSchema, 'params'),
  productController.getById
);

export default router;
