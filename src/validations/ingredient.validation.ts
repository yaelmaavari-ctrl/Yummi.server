import Joi from 'joi';
import { IngredientStatus } from '../types';

export const createIngredientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  status: Joi.string()
    .valid(...Object.values(IngredientStatus))
    .optional()
    .default(IngredientStatus.AVAILABLE),
});

export const updateIngredientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});

export const setStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(IngredientStatus))
    .required(),
});

export const ingredientIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const reportShortageSchema = Joi.object({
  message: Joi.string().trim().max(500).optional().allow(''),
});

export const replenishSchema = Joi.object({
  notificationId: Joi.string().optional(),
});
