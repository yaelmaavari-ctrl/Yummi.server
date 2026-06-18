import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { Category } from '../src/models/category.model';
import { Product } from '../src/models/product.model';
import { UserRole } from '../src/types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = `http://localhost:${process.env['PORT'] ?? '5000'}/api`;
const ADMIN_EMAIL = 'category-test-admin@example.com';
const ADMIN_PASSWORD = 'TestAdmin123!';
const CUSTOMER_EMAIL = 'category-test-customer@example.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

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

async function request(
  method: string,
  urlPath: string,
  options: { token?: string; body?: unknown } = {}
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

async function ensureTestUsers(): Promise<void> {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      fullName: 'Category Test Admin',
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      phone: '0500000001',
      roles: [UserRole.ADMIN],
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const customerHash = await bcrypt.hash(CUSTOMER_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: CUSTOMER_EMAIL },
    {
      fullName: 'Category Test Customer',
      email: CUSTOMER_EMAIL,
      passwordHash: customerHash,
      phone: '0500000002',
      roles: [UserRole.CUSTOMER],
      isActive: true,
    },
    { upsert: true, new: true }
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

async function cleanupTestCategories(): Promise<void> {
  const testNames = ['Test Pizzas', 'Test Burgers', 'Test Blocked Delete'];
  await Category.deleteMany({ name: { $in: testNames } });
  await Product.deleteMany({ name: 'Test Product For Delete Guard' });
}

async function runTests(): Promise<void> {
  console.log('\n=== Category Integration Tests ===\n');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check returns 200');

  const unauth = await request('GET', '/categories');
  assert(unauth.status === 401, 'Unauthenticated list returns 401');

  const customerToken = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  const customerDenied = await request('GET', '/categories', { token: customerToken });
  assert(customerDenied.status === 403, 'Customer list returns 403');

  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD, UserRole.ADMIN);

  const invalidCreate = await request('POST', '/categories', {
    token: adminToken,
    body: { name: 'A' },
  });
  assert(invalidCreate.status === 400, 'Invalid create returns 400');

  const create = await request('POST', '/categories', {
    token: adminToken,
    body: {
      name: 'Test Pizzas',
      description: 'All pizza items',
      image: 'https://example.com/pizzas.png',
    },
  });
  assert(create.status === 201, 'Create category returns 201');

  const category = (create.body['data'] as { category: { id: string; name: string } }).category;
  assert(category.name === 'Test Pizzas', 'Created category has correct name');

  const duplicate = await request('POST', '/categories', {
    token: adminToken,
    body: { name: 'test pizzas' },
  });
  assert(duplicate.status === 409, 'Duplicate name returns 409');

  const list = await request('GET', '/categories', { token: adminToken });
  assert(list.status === 200, 'List categories returns 200');
  const categories = (list.body['data'] as { categories: { id: string }[] }).categories;
  assert(categories.some((c) => c.id === category.id), 'List includes created category');

  const getById = await request('GET', `/categories/${category.id}`, { token: adminToken });
  assert(getById.status === 200, 'Get by id returns 200');

  const update = await request('PATCH', `/categories/${category.id}`, {
    token: adminToken,
    body: { description: 'Updated description' },
  });
  assert(update.status === 200, 'Update category returns 200');
  const updated = (update.body['data'] as { category: { description: string } }).category;
  assert(updated.description === 'Updated description', 'Update persists description');

  const blockedCategory = await Category.create({ name: 'Test Blocked Delete' });
  await Product.create({
    name: 'Test Product For Delete Guard',
    category: blockedCategory._id,
    isAvailable: true,
    isDeleted: false,
  });

  const blockedDelete = await request('DELETE', `/categories/${blockedCategory._id}`, {
    token: adminToken,
  });
  assert(blockedDelete.status === 409, 'Delete blocked when active products exist');

  const deleteRes = await request('DELETE', `/categories/${category.id}`, { token: adminToken });
  assert(deleteRes.status === 200, 'Soft delete returns 200');

  const deletedGet = await request('GET', `/categories/${category.id}`, { token: adminToken });
  assert(deletedGet.status === 404, 'Deleted category returns 404 on get');

  const deletedUpdate = await request('PATCH', `/categories/${category.id}`, {
    token: adminToken,
    body: { name: 'Test Burgers' },
  });
  assert(deletedUpdate.status === 404, 'Deleted category returns 404 on update');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  await mongoose.connect(process.env['MONGO_URI'] as string);
  await ensureTestUsers();
  await cleanupTestCategories();

  try {
    await runTests();
  } finally {
    await cleanupTestCategories();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Test run failed:', error);
  process.exit(1);
});
