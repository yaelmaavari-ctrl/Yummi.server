import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { UserRole } from '../types';
import {
  orderIdParamsSchema,
  placeOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from '../validations/order.validation';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 * Mounted at /api/orders
 */
router.use(authenticate);

router.get(
  '/kitchen',
  authorize(UserRole.KITCHEN, UserRole.ADMIN),
  orderController.getKitchenOrders
);

router.get(
  '/:id/ingredient-check',
  authorize(UserRole.KITCHEN, UserRole.ADMIN),
  validate(orderIdParamsSchema, 'params'),
  orderController.checkOrderIngredients
);

router.get('/my', orderController.getMyOrders);

router.get(
  '/',
  authorize(UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN),
  orderController.getAllOrders
);

router.post(
  '/',
  authorize(UserRole.CUSTOMER),
  validate(placeOrderSchema),
  orderController.createOrder
);

router.patch(
  '/:id/status',
  authorize(UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN),
  validate(orderIdParamsSchema, 'params'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

router.post(
  '/:id/cancel',
  authorize(UserRole.CUSTOMER),
  validate(orderIdParamsSchema, 'params'),
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

export default router;
