import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { placeOrderSchema } from '../validations/order.validation';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 */
router.post('/', authenticate, validate(placeOrderSchema), orderController.createOrder);

export default router;
