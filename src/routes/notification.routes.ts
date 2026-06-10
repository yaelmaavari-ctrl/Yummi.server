import { Router } from 'express';

const router = Router();

/**
 * Notification routes. Owner: Developer B.
 * TODO: wire list (my notifications) and markAsRead to notificationController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Notification endpoints not implemented yet' });
});

export default router;
