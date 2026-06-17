import Joi from 'joi';
import { UserRole } from '../types';

const EMPLOYEE_ROLES = [UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];

const addressSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).required(),
  street: Joi.string().trim().min(2).max(100).required(),
  houseNumber: Joi.string().trim().min(1).max(20).required(),
});

export const createEmployeeSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  roles: Joi.array()
    .items(Joi.string().valid(...EMPLOYEE_ROLES))
    .min(1)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one role is required',
      'any.only': 'Employee roles must be one of: KITCHEN, DELIVERY, ADMIN',
    }),
  defaultAddress: addressSchema.optional(),
});

export const updateRolesSchema = Joi.object({
  roles: Joi.array()
    .items(Joi.string().valid(...Object.values(UserRole)))
    .min(1)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one role is required',
    }),
});

export const addRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
});

export const removeRoleParamsSchema = Joi.object({
  id: Joi.string().required(),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
});

export const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});
