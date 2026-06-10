import { Schema, model, Document } from 'mongoose';

/**
 * BusinessHours document. Owner: Developer A (Configuration).
 *
 * Admins define a regular weekly schedule and special days (e.g. holidays
 * that are closed or have different hours). Orders cannot be placed when the
 * business is closed.
 *
 * TODO (Developer A): define fields, e.g.:
 *   - weeklySchedule: [{ dayOfWeek: 0-6, openTime: 'HH:mm', closeTime: 'HH:mm', isClosed: boolean }]
 *   - specialDays: [{ date: Date, label: string, isClosed: boolean, openTime, closeTime }]
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IBusinessHours extends Document {
  // TODO: define fields
}

const businessHoursSchema = new Schema<IBusinessHours>(
  {
    // TODO: define schema fields
  },
  { timestamps: true }
);

export const BusinessHours = model<IBusinessHours>('BusinessHours', businessHoursSchema);
