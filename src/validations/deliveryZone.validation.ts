import Joi from 'joi';

export const createDeliveryZoneSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).required(),
  deliveryPrice: Joi.number().min(0).required(),
  estimatedDeliveryMinutes: Joi.number().integer().min(1).required(),
});

export const updateDeliveryZoneSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).optional(),
  deliveryPrice: Joi.number().min(0).optional(),
  estimatedDeliveryMinutes: Joi.number().integer().min(1).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

export const setZoneStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

export const deliveryZoneIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const cityParamSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).required(),
});
