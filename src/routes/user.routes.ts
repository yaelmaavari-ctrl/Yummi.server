import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createEmployeeSchema,
  updateRolesSchema,
  addRoleSchema,
  removeRoleParamsSchema,
  updateStatusSchema,
} from '../validations/user.validation';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post('/employees', validate(createEmployeeSchema), userController.createEmployee);
router.get('/employees', userController.getEmployees);
router.get('/:id', userController.getUserById);
router.post('/:id/roles/add', validate(addRoleSchema), userController.addRole);
router.delete(
  '/:id/roles/:role',
  validate(removeRoleParamsSchema, 'params'),
  userController.removeRole
);
router.patch('/:id/roles', validate(updateRolesSchema), userController.updateRoles);
router.patch('/:id/status', validate(updateStatusSchema), userController.updateStatus);

export default router;
