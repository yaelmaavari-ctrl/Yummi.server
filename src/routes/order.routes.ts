import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  orderIdParamsSchema,
  placeOrderSchema,
  updateOrderStatusSchema,
} from '../validations/order.validation';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 * Mounted at /api/orders
 */
router.get('/kitchen', authenticate, orderController.getKitchenOrders);
router.get('/my', authenticate, orderController.getMyOrders);
router.get('/', authenticate, orderController.getAllOrders);
router.patch(
  '/:id/status',
  authenticate,
  validate(orderIdParamsSchema, 'params'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);
router.post('/', authenticate, validate(placeOrderSchema), orderController.createOrder);

router.patch(
  '/:orderId/status',
  authenticate,
  validate(orderParamsSchema, 'params'),
  validate(updateStatusSchema),
  orderController.updateOrderStatus
);

export default router;
