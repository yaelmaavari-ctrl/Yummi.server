import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(UserRole.ADMIN), statsController.getDashboard);

export default router;
