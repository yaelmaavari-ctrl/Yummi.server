import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  placeOrderSchema,
  orderParamsSchema,
  updateStatusSchema,
} from '../validations/order.validation';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 */
router.post('/', authenticate, validate(placeOrderSchema), orderController.createOrder);

router.patch(
  '/:orderId/status',
  authenticate,
  validate(orderParamsSchema, 'params'),
  validate(updateStatusSchema),
  orderController.updateOrderStatus
);

export default router;
