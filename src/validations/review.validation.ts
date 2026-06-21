import Joi from 'joi';

export const createReviewSchema = Joi.object({
  orderId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).optional().allow(''),
});

export const reviewIdParamSchema = Joi.object({
  id: Joi.string().required(),
});
