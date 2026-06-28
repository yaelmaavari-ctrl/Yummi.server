import {
  BusinessHours,
  IBusinessHours,
  IWeeklyScheduleEntry,
  ISpecialDay,
  DEFAULT_WEEKLY_SCHEDULE,
} from '../models/businessHours.model';
import { ApiError } from '../utils/ApiError';

export interface PublicBusinessHours {
  id: string;
  weeklySchedule: IWeeklyScheduleEntry[];
  specialDays: ISpecialDay[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IsOpenResult {
  isOpen: boolean;
  reason: string;
  currentTime: string;
  todaySchedule: IWeeklyScheduleEntry | ISpecialDay | null;
}

function toPublic(doc: IBusinessHours): PublicBusinessHours {
  return {
    id: doc._id.toString(),
    weeklySchedule: doc.weeklySchedule,
    specialDays: doc.specialDays,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function padTwo(n: number): string {
  return n.toString().padStart(2, '0');
}

function nowDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function nowTimeString(): string {
  const d = new Date();
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true when the current time falls within [openTime, closeTime).
 * Handles overnight ranges (e.g. 22:00–01:00) where closeTime < openTime.
 */
function isOpenInRange(now: number, open: number, close: number): boolean {
  if (close <= open) {
    // Overnight span: open if we're after opening OR before closing next day
    return now >= open || now < close;
  }
  return now >= open && now < close;
}

/** Returns the singleton document, creating it with defaults if absent. */
async function findOrCreate(): Promise<IBusinessHours> {
  let doc = await BusinessHours.findOne();
  if (!doc) {
    doc = await BusinessHours.create({ weeklySchedule: DEFAULT_WEEKLY_SCHEDULE, specialDays: [] });
  }
  return doc;
}

async function get(): Promise<PublicBusinessHours> {
  const doc = await findOrCreate();
  return toPublic(doc);
}

async function updateWeeklySchedule(
  schedule: IWeeklyScheduleEntry[]
): Promise<PublicBusinessHours> {
  // Validate that exactly one entry per day (0-6)
  const days = schedule.map((e) => e.dayOfWeek).sort();
  if (days.join(',') !== '0,1,2,3,4,5,6') {
    throw ApiError.badRequest('weeklySchedule must contain exactly one entry for each day 0–6');
  }

  const doc = await findOrCreate();
  doc.weeklySchedule = schedule;
  await doc.save();
  return toPublic(doc);
}

async function addSpecialDay(input: ISpecialDay): Promise<PublicBusinessHours> {
  if (!input.isClosed && (!input.openTime || !input.closeTime)) {
    throw ApiError.badRequest('openTime and closeTime are required when the day is not closed');
  }

  if (input.endDate && input.endDate < input.date) {
    throw ApiError.badRequest('"endDate" must be on or after "date"');
  }

  const doc = await findOrCreate();

  // Replace existing entry whose start date matches, or push a new one
  const idx = doc.specialDays.findIndex((s) => s.date === input.date);
  if (idx !== -1) {
    doc.specialDays[idx] = input;
  } else {
    doc.specialDays.push(input);
  }

  // Keep specialDays sorted by start date for readability
  doc.specialDays.sort((a, b) => a.date.localeCompare(b.date));
  doc.markModified('specialDays');
  await doc.save();
  return toPublic(doc);
}

async function removeSpecialDay(date: string): Promise<PublicBusinessHours> {
  const doc = await findOrCreate();

  const idx = doc.specialDays.findIndex((s) => s.date === date);
  if (idx === -1) {
    throw ApiError.notFound(`No special day entry found with start date: ${date}`);
  }

  doc.specialDays.splice(idx, 1);
  doc.markModified('specialDays');
  await doc.save();
  return toPublic(doc);
}

/**
 * Checks whether the business is currently open.
 * Special days take precedence over the weekly schedule.
 * Called by the order service before accepting new orders.
 */
async function isOpenNow(): Promise<IsOpenResult> {
  const doc = await findOrCreate();

  const todayDate = nowDateString();
  const currentTime = nowTimeString();
  const dayOfWeek = new Date().getDay(); // 0=Sunday

  // Check special day first — a range entry matches if today falls within [date, endDate]
  const specialDay = doc.specialDays.find((s) => {
    const end = s.endDate ?? s.date;
    return todayDate >= s.date && todayDate <= end;
  });
  if (specialDay) {
    if (specialDay.isClosed) {
      return {
        isOpen: false,
        reason: `Closed — ${specialDay.label}`,
        currentTime,
        todaySchedule: specialDay,
      };
    }

    const open = timeToMinutes(specialDay.openTime!);
    const close = timeToMinutes(specialDay.closeTime!);
    const now = timeToMinutes(currentTime);
    const isOpen = isOpenInRange(now, open, close);

    return {
      isOpen,
      reason: isOpen
        ? `Open — ${specialDay.label} (${specialDay.openTime}–${specialDay.closeTime})`
        : `Closed — ${specialDay.label} opens at ${specialDay.openTime}`,
      currentTime,
      todaySchedule: specialDay,
    };
  }

  // Fall back to weekly schedule
  const dayEntry = doc.weeklySchedule.find((e) => e.dayOfWeek === dayOfWeek);
  if (!dayEntry) {
    return {
      isOpen: false,
      reason: 'No schedule defined for today',
      currentTime,
      todaySchedule: null,
    };
  }

  if (dayEntry.isClosed) {
    return {
      isOpen: false,
      reason: 'Closed today (regular day off)',
      currentTime,
      todaySchedule: dayEntry,
    };
  }

  const open = timeToMinutes(dayEntry.openTime);
  const close = timeToMinutes(dayEntry.closeTime);
  const now = timeToMinutes(currentTime);
  const isOpen = isOpenInRange(now, open, close);

  const overnight = close <= open;
  const notOpenYet = !overnight && now < open;

  return {
    isOpen,
    reason: isOpen
      ? `Open (${dayEntry.openTime}–${dayEntry.closeTime})`
      : notOpenYet
        ? `Not open yet — opens at ${dayEntry.openTime}`
        : `Closed for today — reopens at ${dayEntry.openTime}`,
    currentTime,
    todaySchedule: dayEntry,
  };
}

export const businessHoursService = {
  get,
  updateWeeklySchedule,
  addSpecialDay,
  removeSpecialDay,
  isOpenNow,
};
