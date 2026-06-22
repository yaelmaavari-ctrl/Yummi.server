import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  addItemSchema,
  updateItemParamsSchema,
  updateItemSchema,
  removeItemQuerySchema,
} from '../validations/cart.validation';

const router = Router();

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema), cartController.addItem);
router.patch(
  '/items/:productId',
  validate(updateItemParamsSchema, 'params'),
  validate(updateItemSchema),
  cartController.updateItem
);
router.delete(
  '/items/:productId',
  validate(updateItemParamsSchema, 'params'),
  validate(removeItemQuerySchema, 'query'),
  cartController.removeItem
);

export default router;
