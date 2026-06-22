import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { BusinessHours } from '../src/models/businessHours.model';
import { UserRole } from '../src/types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = `http://localhost:${process.env['PORT'] ?? '5000'}/api`;
const ADMIN_EMAIL = 'bh-test-admin@example.com';
const ADMIN_PASSWORD = 'TestAdmin123!';
const CUSTOMER_EMAIL = 'bh-test-customer@example.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

const TEST_SPECIAL_START = '2099-01-01';
const TEST_SPECIAL_END = '2099-01-03';
const TEST_SPECIAL_SINGLE = '2099-02-14';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failed += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function todayDateString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function request(
  method: string,
  urlPath: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

function fullWeeklySchedule(overrides: Partial<{ isClosed: boolean; openTime: string; closeTime: string }> = {}) {
  const base = { openTime: '09:00', closeTime: '22:00', isClosed: false, ...overrides };
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, ...base }));
}

async function ensureTestUsers(): Promise<void> {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      fullName: 'BH Test Admin',
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      phone: '0500000011',
      roles: [UserRole.ADMIN],
      isActive: true,
    },
    { upsert: true, new: true },
  );

  const customerHash = await bcrypt.hash(CUSTOMER_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: CUSTOMER_EMAIL },
    {
      fullName: 'BH Test Customer',
      email: CUSTOMER_EMAIL,
      passwordHash: customerHash,
      phone: '0500000012',
      roles: [UserRole.CUSTOMER],
      isActive: true,
    },
    { upsert: true, new: true },
  );
}

async function login(email: string, password: string, activeRole?: UserRole): Promise<string> {
  const { status, body } = await request('POST', '/auth/login', {
    body: { email, password, activeRole },
  });

  if (status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }

  const data = body['data'] as { token: string };
  return data.token;
}

async function cleanupTestSpecialDays(): Promise<void> {
  const doc = await BusinessHours.findOne();
  if (!doc) return;

  doc.specialDays = doc.specialDays.filter(
    (s) =>
      !s.date.startsWith('2099-') &&
      s.date !== todayDateString() &&
      s.date !== `${todayDateString().slice(0, 4)}-12-25`,
  );
  doc.markModified('specialDays');
  await doc.save();
}

/** Restore weekly schedule after tests (Sunday open, Saturday closed). */
async function restoreWeeklySchedule(): Promise<void> {
  const doc = await BusinessHours.findOne();
  if (!doc) return;

  doc.weeklySchedule = fullWeeklySchedule({ openTime: '09:00', closeTime: '22:00' }).map((d) =>
    d.dayOfWeek === 6 ? { ...d, isClosed: true } : { ...d, isClosed: false }
  );
  doc.markModified('weeklySchedule');
  await doc.save();
}

async function runTests(): Promise<void> {
  console.log('\n=== Business Hours Integration Tests ===\n');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check returns 200');

  const unauth = await request('GET', '/business-hours');
  assert(unauth.status === 401, 'Unauthenticated GET returns 401');

  const customerToken = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD, UserRole.ADMIN);

  // --- GET schedule ---
  const getSchedule = await request('GET', '/business-hours', { token: customerToken });
  assert(getSchedule.status === 200, 'Customer GET schedule returns 200');
  const bh = (getSchedule.body['data'] as { businessHours: { weeklySchedule: unknown[]; specialDays: unknown[] } })
    .businessHours;
  assert(Array.isArray(bh.weeklySchedule) && bh.weeklySchedule.length === 7, 'Schedule has 7 weekly entries');
  assert(Array.isArray(bh.specialDays), 'specialDays is an array');

  // --- GET is-open ---
  const isOpen = await request('GET', '/business-hours/is-open', { token: customerToken });
  assert(isOpen.status === 200, 'Customer GET is-open returns 200');
  const isOpenData = isOpen.body['data'] as { isOpen: boolean; reason: string; currentTime: string };
  assert(typeof isOpenData.isOpen === 'boolean', 'isOpen is boolean');
  assert(typeof isOpenData.reason === 'string' && isOpenData.reason.length > 0, 'reason is non-empty string');
  assert(/^\d{2}:\d{2}$/.test(isOpenData.currentTime), 'currentTime is HH:mm');

  // --- PUT weekly-schedule: auth + validation ---
  const customerUpdate = await request('PUT', '/business-hours/weekly-schedule', {
    token: customerToken,
    body: { weeklySchedule: fullWeeklySchedule() },
  });
  assert(customerUpdate.status === 403, 'Customer PUT weekly-schedule returns 403');

  const shortSchedule = await request('PUT', '/business-hours/weekly-schedule', {
    token: adminToken,
    body: {
      weeklySchedule: [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false },
      ],
    },
  });
  assert(shortSchedule.status === 400, 'Schedule with fewer than 7 days returns 400');

  const badTime = await request('PUT', '/business-hours/weekly-schedule', {
    token: adminToken,
    body: {
      weeklySchedule: fullWeeklySchedule().map((d) =>
        d.dayOfWeek === 0 ? { ...d, openTime: '25:00' } : d,
      ),
    },
  });
  assert(badTime.status === 400, 'Invalid openTime format returns 400');

  const updateSchedule = await request('PUT', '/business-hours/weekly-schedule', {
    token: adminToken,
    body: {
      weeklySchedule: fullWeeklySchedule({ openTime: '08:00', closeTime: '23:00' }).map((d) =>
        d.dayOfWeek === 0 || d.dayOfWeek === 6 ? { ...d, isClosed: true } : d,
      ),
    },
  });
  assert(updateSchedule.status === 200, 'Admin PUT weekly-schedule returns 200');
  const updated = (updateSchedule.body['data'] as {
    businessHours: { weeklySchedule: { dayOfWeek: number; openTime: string; isClosed: boolean }[] };
  }).businessHours;
  assert(updated.weeklySchedule.find((d) => d.dayOfWeek === 1)?.openTime === '08:00', 'Schedule update persists');
  assert(updated.weeklySchedule.find((d) => d.dayOfWeek === 0)?.isClosed === true, 'Sunday marked closed');

  // --- POST special-days: single day ---
  const customerSpecial = await request('POST', '/business-hours/special-days', {
    token: customerToken,
    body: { date: TEST_SPECIAL_SINGLE, label: 'Valentine', isClosed: true },
  });
  assert(customerSpecial.status === 403, 'Customer POST special-days returns 403');

  const openWithoutHours = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: { date: TEST_SPECIAL_SINGLE, label: 'Open Day', isClosed: false },
  });
  assert(openWithoutHours.status === 400, 'Open special day without hours returns 400');

  const badEndDate = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: {
      date: TEST_SPECIAL_END,
      endDate: TEST_SPECIAL_START,
      label: 'Bad Range',
      isClosed: true,
    },
  });
  assert(badEndDate.status === 400, 'endDate before date returns 400');

  const addSingle = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: { date: TEST_SPECIAL_SINGLE, label: 'Valentine', isClosed: true },
  });
  assert(addSingle.status === 200, 'Admin POST single special day returns 200');
  const afterSingle = (addSingle.body['data'] as { businessHours: { specialDays: { date: string }[] } })
    .businessHours;
  assert(
    afterSingle.specialDays.some((s) => s.date === TEST_SPECIAL_SINGLE),
    'Single special day appears in schedule',
  );

  // --- POST special-days: date range ---
  const addRange = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: {
      date: TEST_SPECIAL_START,
      endDate: TEST_SPECIAL_END,
      label: 'Future Holiday',
      isClosed: true,
    },
  });
  assert(addRange.status === 200, 'Admin POST date range returns 200');
  const afterRange = (addRange.body['data'] as {
    businessHours: { specialDays: { date: string; endDate?: string }[] };
  }).businessHours;
  const rangeEntry = afterRange.specialDays.find((s) => s.date === TEST_SPECIAL_START);
  assert(rangeEntry?.endDate === TEST_SPECIAL_END, 'Range entry stores endDate');

  // Replace same start date
  const replaceRange = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: {
      date: TEST_SPECIAL_START,
      endDate: TEST_SPECIAL_END,
      label: 'Future Holiday Updated',
      isClosed: false,
      openTime: '10:00',
      closeTime: '14:00',
    },
  });
  assert(replaceRange.status === 200, 'Replacing special day by start date returns 200');
  const replaced = (replaceRange.body['data'] as {
    businessHours: { specialDays: { date: string; label: string; isClosed: boolean }[] };
  }).businessHours;
  const replacedEntry = replaced.specialDays.find((s) => s.date === TEST_SPECIAL_START);
  assert(replacedEntry?.label === 'Future Holiday Updated', 'Special day is replaced not duplicated');
  assert(replacedEntry?.isClosed === false, 'Replaced entry updates isClosed');

  // --- is-open with today's special day override ---
  const today = todayDateString();
  const closedToday = await request('POST', '/business-hours/special-days', {
    token: adminToken,
    body: { date: today, label: 'Test Closed Today', isClosed: true },
  });
  assert(closedToday.status === 200, 'Add today as closed special day returns 200');

  const isOpenClosed = await request('GET', '/business-hours/is-open', { token: customerToken });
  assert(isOpenClosed.status === 200, 'is-open after today override returns 200');
  const closedData = isOpenClosed.body['data'] as { isOpen: boolean; reason: string };
  assert(closedData.isOpen === false, 'is-open is false when today is a closed special day');
  assert(closedData.reason.includes('Test Closed Today'), 'is-open reason references special day label');

  // Remove today's override so is-open falls back to weekly schedule
  await request('DELETE', `/business-hours/special-days/${today}`, { token: adminToken });

  // --- DELETE special-days ---
  const deleteMissing = await request('DELETE', '/business-hours/special-days/2099-12-31', {
    token: adminToken,
  });
  assert(deleteMissing.status === 404, 'DELETE non-existent special day returns 404');

  const deleteRange = await request('DELETE', `/business-hours/special-days/${TEST_SPECIAL_START}`, {
    token: adminToken,
  });
  assert(deleteRange.status === 200, 'DELETE range by start date returns 200');
  const afterDeleteRange = (deleteRange.body['data'] as { businessHours: { specialDays: { date: string }[] } })
    .businessHours;
  assert(
    !afterDeleteRange.specialDays.some((s) => s.date === TEST_SPECIAL_START),
    'Range entry removed from specialDays',
  );

  const deleteSingle = await request('DELETE', `/business-hours/special-days/${TEST_SPECIAL_SINGLE}`, {
    token: adminToken,
  });
  assert(deleteSingle.status === 200, 'DELETE single special day returns 200');

  const badDateParam = await request('DELETE', '/business-hours/special-days/not-a-date', {
    token: adminToken,
  });
  assert(badDateParam.status === 400, 'DELETE with invalid date param returns 400');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  await mongoose.connect(process.env['MONGO_URI'] as string);
  await ensureTestUsers();
  await cleanupTestSpecialDays();

  try {
    await runTests();
  } finally {
    await cleanupTestSpecialDays();
    await restoreWeeklySchedule();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Test run failed:', error);
  process.exit(1);
});
