import Joi from 'joi';

const objectId = Joi.string();
const objectIdList = Joi.array().items(objectId);

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().max(2048).optional().allow(''),
  price: Joi.number().min(0).required(),
  categories: objectIdList.min(1).required(),
  ingredients: objectIdList.default([]),
  allowedExtras: objectIdList.default([]),
  freeExtrasCount: Joi.number().integer().min(0).optional().default(0),
  pricePerExtra: Joi.number().min(0).optional().default(0),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().max(2048).optional().allow(''),
  price: Joi.number().min(0).optional(),
  categories: objectIdList.min(1).optional(),
  ingredients: objectIdList.optional(),
  allowedExtras: objectIdList.optional(),
  freeExtrasCount: Joi.number().integer().min(0).optional(),
  pricePerExtra: Joi.number().min(0).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

export const setAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required(),
});

export const productIdParamSchema = Joi.object({
  id: Joi.string().required(),
});
