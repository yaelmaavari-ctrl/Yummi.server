/**
 * One-off: ensure Sunday is open and remove any closed special-day override for today.
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { BusinessHours, DEFAULT_WEEKLY_SCHEDULE } from '../src/models/businessHours.model';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function todayDateString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main(): Promise<void> {
  await mongoose.connect(process.env['MONGO_URI'] as string);

  let doc = await BusinessHours.findOne();
  if (!doc) {
    doc = await BusinessHours.create({
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      specialDays: [],
    });
    console.log('Created business hours with defaults (Sunday open).');
  } else {
    const sunday = doc.weeklySchedule.find((e) => e.dayOfWeek === 0);
    if (sunday) {
      sunday.isClosed = false;
      sunday.openTime = sunday.openTime || '09:00';
      sunday.closeTime = sunday.closeTime || '22:00';
    }

    const today = todayDateString();
    const before = doc.specialDays.length;
    doc.specialDays = doc.specialDays.filter(
      (s) => !(s.date === today && s.isClosed) && !s.label.includes('Test Closed Today')
    );
    doc.markModified('weeklySchedule');
    doc.markModified('specialDays');
    await doc.save();

    console.log(`Sunday: open ${sunday?.openTime}–${sunday?.closeTime}`);
    if (doc.specialDays.length < before) {
      console.log(`Removed closed special-day override for ${today}.`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
