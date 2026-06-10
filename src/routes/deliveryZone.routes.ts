import { Router } from 'express';

const router = Router();

/**
 * Delivery zone routes. Owner: Developer A.
 * TODO: wire list/create/update/delete and city-availability check to deliveryZoneController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Delivery zone endpoints not implemented yet' });
});

export default router;
