import { Router } from 'express';

const router = Router();

/**
 * Product routes. Owner: Developer A.
 * TODO: wire list/getById/create/update/setAvailability/softDelete to productController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Product endpoints not implemented yet' });
});

export default router;
