import Joi from 'joi';
import { UserRole } from '../types';

const addressSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).required(),
  street: Joi.string().trim().min(2).max(100).required(),
  houseNumber: Joi.string().trim().min(1).max(20).required(),
});

export const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  defaultAddress: addressSchema.optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
  activeRole: Joi.string()
    .valid(...Object.values(UserRole))
    .optional(),
});

export const switchRoleSchema = Joi.object({
  activeRole: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
});

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().trim().min(7).max(20).optional(),
  defaultAddress: addressSchema.optional().allow(null),
}).min(1);
