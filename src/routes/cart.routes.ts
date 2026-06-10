import { Router } from 'express';

const router = Router();

/**
 * Cart routes. Owner: Developer B.
 * TODO: wire get/addItem/updateItem/removeItem/clear to cartController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Cart endpoints not implemented yet' });
});

export default router;
