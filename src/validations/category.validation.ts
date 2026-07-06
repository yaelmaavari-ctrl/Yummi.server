import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).optional().allow(''),
  image: Joi.string().trim().uri().max(2048).optional().allow(''),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  image: Joi.string().trim().uri().max(2048).optional().allow(''),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

export const categoryIdParamSchema = Joi.object({
  id: objectId.required(),
});
