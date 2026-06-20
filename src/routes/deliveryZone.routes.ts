import { Router } from 'express';
import { deliveryZoneController } from '../controllers/deliveryZone.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  setZoneStatusSchema,
  deliveryZoneIdParamSchema,
  cityParamSchema,
} from '../validations/deliveryZone.validation';
import { UserRole } from '../types';

const router = Router();

const allRoles = [UserRole.CUSTOMER, UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];

router.use(authenticate);

// Static paths before dynamic /:id to avoid route conflicts
router.get(
  '/city/:city',
  authorize(...allRoles),
  validate(cityParamSchema, 'params'),
  deliveryZoneController.checkCity,
);

router.get('/', authorize(...allRoles), deliveryZoneController.list);

router.get(
  '/:id',
  authorize(...allRoles),
  validate(deliveryZoneIdParamSchema, 'params'),
  deliveryZoneController.getById,
);

router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createDeliveryZoneSchema),
  deliveryZoneController.create,
);

router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN),
  validate(deliveryZoneIdParamSchema, 'params'),
  validate(setZoneStatusSchema),
  deliveryZoneController.setStatus,
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(deliveryZoneIdParamSchema, 'params'),
  validate(updateDeliveryZoneSchema),
  deliveryZoneController.update,
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(deliveryZoneIdParamSchema, 'params'),
  deliveryZoneController.remove,
);

export default router;
