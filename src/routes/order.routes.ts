import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listOrdersQuerySchema, placeOrderSchema } from '../validations/order.validation';
import { UserRole } from '../types';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 */
router.get(
  '/kitchen',
  authenticate,
  authorize(UserRole.KITCHEN, UserRole.ADMIN),
  orderController.listKitchenOrders
);
router.get('/', authenticate, validate(listOrdersQuerySchema, 'query'), orderController.listOrders);
router.post('/', authenticate, validate(placeOrderSchema), orderController.createOrder);

export default router;
