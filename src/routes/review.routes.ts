import { Router } from 'express';

const router = Router();

/**
 * Review routes. Owner: Developer A.
 * TODO: wire create (one per completed order) and list-by-product to reviewController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Review endpoints not implemented yet' });
});

export default router;
