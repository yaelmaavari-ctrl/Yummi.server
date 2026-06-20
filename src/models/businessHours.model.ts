import { Schema, model, Document } from 'mongoose';

export interface IWeeklyScheduleEntry {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
}

export interface ISpecialDay {
  date: string; // "YYYY-MM-DD" — start date (also used as unique key)
  endDate?: string; // "YYYY-MM-DD" — inclusive end date; absent = single day
  label: string;
  isClosed: boolean;
  openTime?: string; // required when isClosed = false
  closeTime?: string; // required when isClosed = false
}

export interface IBusinessHours extends Document {
  weeklySchedule: IWeeklyScheduleEntry[];
  specialDays: ISpecialDay[];
  createdAt: Date;
  updatedAt: Date;
}

const weeklyScheduleEntrySchema = new Schema<IWeeklyScheduleEntry>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    openTime: { type: String, required: true, default: '09:00' },
    closeTime: { type: String, required: true, default: '22:00' },
    isClosed: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const specialDaySchema = new Schema<ISpecialDay>(
  {
    date: { type: String, required: true },
    endDate: { type: String },
    label: { type: String, required: true, trim: true },
    isClosed: { type: Boolean, required: true },
    openTime: { type: String },
    closeTime: { type: String },
  },
  { _id: false }
);

const businessHoursSchema = new Schema<IBusinessHours>(
  {
    weeklySchedule: { type: [weeklyScheduleEntrySchema], required: true },
    specialDays: { type: [specialDaySchema], default: [] },
  },
  { timestamps: true }
);

export const BusinessHours = model<IBusinessHours>('BusinessHours', businessHoursSchema);

/** Default weekly schedule: Mon–Fri 09:00–22:00 open, Sat–Sun closed. */
export const DEFAULT_WEEKLY_SCHEDULE: IWeeklyScheduleEntry[] = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: true }, // Sunday
  { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Monday
  { dayOfWeek: 2, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Tuesday
  { dayOfWeek: 3, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Wednesday
  { dayOfWeek: 4, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Thursday
  { dayOfWeek: 5, openTime: '09:00', closeTime: '22:00', isClosed: false }, // Friday
  { dayOfWeek: 6, openTime: '09:00', closeTime: '22:00', isClosed: true }, // Saturday
];
