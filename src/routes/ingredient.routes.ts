import { Router } from 'express';

const router = Router();

/**
 * Ingredient routes. Owner: Developer A.
 * TODO: wire list/create/update/updateStock/setStatus to ingredientController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Ingredient endpoints not implemented yet' });
});

export default router;
