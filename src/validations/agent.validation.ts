import Joi from 'joi';

/**
 * Agent chat validation (Joi).
 *
 * Caps message and history sizes to bound prompt cost and reduce prompt-abuse
 * surface. Only `user`/`assistant` turns are accepted as prior history.
 */
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

export const agentChatSchema = Joi.object({
  message: Joi.string().trim().min(1).max(MAX_MESSAGE_LENGTH).required(),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().trim().min(1).max(MAX_MESSAGE_LENGTH).required(),
      })
    )
    .max(MAX_HISTORY_TURNS)
    .default([]),
});
