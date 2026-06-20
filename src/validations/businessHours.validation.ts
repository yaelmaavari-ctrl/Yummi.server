import Joi from 'joi';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const weeklyScheduleEntrySchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  openTime: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': '"openTime" must be in HH:mm format (e.g. "09:00")',
  }),
  closeTime: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': '"closeTime" must be in HH:mm format (e.g. "22:00")',
  }),
  isClosed: Joi.boolean().required(),
});

/**
 * Replaces the full 7-day weekly schedule.
 * All seven dayOfWeek values (0-6) must be present (exactly once each).
 */
export const updateWeeklyScheduleSchema = Joi.object({
  weeklySchedule: Joi.array()
    .items(weeklyScheduleEntrySchema)
    .length(7)
    .unique('dayOfWeek')
    .required()
    .messages({
      'array.length': '"weeklySchedule" must contain exactly 7 entries (one per day)',
      'array.unique': 'Each day of the week must appear exactly once',
    }),
});

/**
 * Adds or replaces a special-day override.
 * When isClosed is false, openTime and closeTime are required.
 * endDate is optional — when provided it must be >= date (inclusive range).
 */
export const addSpecialDaySchema = Joi.object({
  date: Joi.string().pattern(datePattern).required().messages({
    'string.pattern.base': '"date" must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(datePattern).optional().messages({
    'string.pattern.base': '"endDate" must be in YYYY-MM-DD format',
  }),
  label: Joi.string().trim().min(2).max(100).required(),
  isClosed: Joi.boolean().required(),
  openTime: Joi.when('isClosed', {
    is: false,
    then: Joi.string().pattern(timePattern).required().messages({
      'string.pattern.base': '"openTime" must be in HH:mm format',
      'any.required': '"openTime" is required when the business is open on this day',
    }),
    otherwise: Joi.string().pattern(timePattern).optional(),
  }),
  closeTime: Joi.when('isClosed', {
    is: false,
    then: Joi.string().pattern(timePattern).required().messages({
      'string.pattern.base': '"closeTime" must be in HH:mm format',
      'any.required': '"closeTime" is required when the business is open on this day',
    }),
    otherwise: Joi.string().pattern(timePattern).optional(),
  }),
});

export const specialDayDateParamSchema = Joi.object({
  date: Joi.string().pattern(datePattern).required().messages({
    'string.pattern.base': '"date" param must be in YYYY-MM-DD format',
  }),
});
