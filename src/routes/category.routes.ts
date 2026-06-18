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

router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/', categoryController.list);
router.get('/:id', validate(categoryIdParamSchema, 'params'), categoryController.getById);
router.post('/', validate(createCategorySchema), categoryController.create);
router.patch(
  '/:id',
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  categoryController.update
);
router.delete('/:id', validate(categoryIdParamSchema, 'params'), categoryController.softDelete);

export default router;
