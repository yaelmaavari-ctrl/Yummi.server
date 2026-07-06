import { Router } from 'express';
import { ingredientController } from '../controllers/ingredient.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createIngredientSchema,
  updateIngredientSchema,
  setStatusSchema,
  reportShortageSchema,
  ingredientIdParamSchema,
  reportShortageSchema,
  replenishSchema,
} from '../validations/ingredient.validation';
import { UserRole } from '../types';

const router = Router();

const catalogViewRoles = [UserRole.CUSTOMER, UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];
const kitchenRoles = [UserRole.KITCHEN, UserRole.ADMIN];

router.use(authenticate);

router.get('/', authorize(...catalogViewRoles), ingredientController.list);

router.get(
  '/:id',
  authorize(...catalogViewRoles),
  validate(ingredientIdParamSchema, 'params'),
  ingredientController.getById
);

router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createIngredientSchema),
  ingredientController.create
);

router.patch(
  '/:id/status',
  authorize(...kitchenRoles),
  validate(ingredientIdParamSchema, 'params'),
  validate(setStatusSchema),
  ingredientController.setStatus
);

router.post(
  '/:id/report-shortage',
  authorize(...kitchenRoles),
  validate(ingredientIdParamSchema, 'params'),
  validate(reportShortageSchema),
  ingredientController.reportShortage
);

router.post(
  '/:id/replenish',
  authorize(UserRole.ADMIN),
  validate(ingredientIdParamSchema, 'params'),
  validate(replenishSchema),
  ingredientController.replenish
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(ingredientIdParamSchema, 'params'),
  validate(updateIngredientSchema),
  ingredientController.update
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(ingredientIdParamSchema, 'params'),
  ingredientController.remove
);

export default router;
