import { Router } from 'express';

const router = Router();

/**
 * Statistics dashboard routes. Owner: Developer B.
 * TODO: wire totals, monthly revenue, most-sold products, average ratings,
 * and total cancellations to statsController (ADMIN only).
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Statistics endpoints not implemented yet' });
});

export default router;
