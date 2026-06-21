import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  addItemSchema,
  updateItemParamsSchema,
  updateItemSchema,
} from '../validations/cart.validation';

const router = Router();

/**
 * Cart routes. Owner: Developer B.
 */
router.get('/', authenticate, cartController.getCart);
router.post('/items', authenticate, validate(addItemSchema), cartController.addItem);
router.patch(
  '/items/:productId',
  authenticate,
  validate(updateItemParamsSchema, 'params'),
  validate(updateItemSchema),
  cartController.updateItem
);

router.delete(
  '/items/:productId',
  authenticate,
  validate(updateItemParamsSchema, 'params'),
  cartController.removeItem
);

export default router;
