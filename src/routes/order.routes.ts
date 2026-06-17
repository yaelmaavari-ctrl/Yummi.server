import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listOrdersQuerySchema, placeOrderSchema } from '../validations/order.validation';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 */
router.get('/', authenticate, validate(listOrdersQuerySchema, 'query'), orderController.listOrders);
router.post('/', authenticate, validate(placeOrderSchema), orderController.createOrder);

export default router;
