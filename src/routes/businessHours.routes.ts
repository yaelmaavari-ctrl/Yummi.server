import { Router } from 'express';
import { businessHoursController } from '../controllers/businessHours.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  updateWeeklyScheduleSchema,
  addSpecialDaySchema,
  specialDayDateParamSchema,
} from '../validations/businessHours.validation';
import { UserRole } from '../types';

const router = Router();

const allRoles = [UserRole.CUSTOMER, UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];

router.use(authenticate);

// Read-only — any authenticated role
router.get('/', authorize(...allRoles), businessHoursController.get);
router.get('/is-open', authorize(...allRoles), businessHoursController.isOpenNow);

// Admin-only mutations
router.put(
  '/weekly-schedule',
  authorize(UserRole.ADMIN),
  validate(updateWeeklyScheduleSchema),
  businessHoursController.updateWeeklySchedule
);

router.post(
  '/special-days',
  authorize(UserRole.ADMIN),
  validate(addSpecialDaySchema),
  businessHoursController.addSpecialDay
);

router.delete(
  '/special-days/:date',
  authorize(UserRole.ADMIN),
  validate(specialDayDateParamSchema, 'params'),
  businessHoursController.removeSpecialDay
);

export default router;
