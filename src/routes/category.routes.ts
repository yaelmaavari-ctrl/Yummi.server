import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../validations/category.validation';
import { UserRole } from '../types';

const router = Router();

const catalogViewRoles = [
  UserRole.CUSTOMER,
  UserRole.KITCHEN,
  UserRole.DELIVERY,
  UserRole.ADMIN,
];

router.use(authenticate);

router.get('/', authorize(...catalogViewRoles), categoryController.list);
router.get(
  '/:id/products',
  authorize(...catalogViewRoles),
  validate(categoryIdParamSchema, 'params'),
  categoryController.listProducts
);
router.get(
  '/:id',
  authorize(...catalogViewRoles),
  validate(categoryIdParamSchema, 'params'),
  categoryController.getById
);

router.post('/', authorize(UserRole.ADMIN), validate(createCategorySchema), categoryController.create);
router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  categoryController.update
);
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(categoryIdParamSchema, 'params'),
  categoryController.softDelete
);

export default router;
