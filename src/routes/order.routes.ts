import { Router } from 'express';

const router = Router();

/**
 * Order routes. Owner: Developer B.
 * TODO: wire customer (place/track/history/cancel), kitchen (take/approve/prepare/ready/complete),
 * and delivery (list-ready/complete) endpoints to orderController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Order endpoints not implemented yet' });
});

export default router;
