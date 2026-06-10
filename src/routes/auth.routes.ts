import { Router } from 'express';

const router = Router();

/**
 * Auth routes. Owner: Developer A.
 * TODO: wire register, login, switch-active-role, me, etc. to authController.
 */
router.get('/', (_req, res) => {
  res.status(501).json({ success: false, message: 'Auth endpoints not implemented yet' });
});

export default router;
