import { Router } from 'express';

const router = Router();

/**
 * Business hours routes. Owner: Developer A.
 * TODO: wire get/update weekly schedule, manage special days, and isOpen check.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Business hours endpoints not implemented yet' });
});

export default router;
