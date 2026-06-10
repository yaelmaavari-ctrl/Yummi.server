import { Router } from 'express';

const router = Router();

/**
 * Category routes. Owner: Developer A.
 * TODO: wire list/getById/create/update/softDelete to categoryController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Category endpoints not implemented yet' });
});

export default router;
