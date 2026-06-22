/**
 * End-to-end integration test covering the main system flows.
 * Run with: npx ts-node scripts/test-system-e2e.ts
 * Requires the API server to be running on PORT (default 5000).
 */
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { Category } from '../src/models/category.model';
import { Product } from '../src/models/product.model';
import { Ingredient } from '../src/models/ingredient.model';
import { DeliveryZone } from '../src/models/deliveryZone.model';
import { Cart } from '../src/models/cart.model';
import { Order } from '../src/models/order.model';
import { Review } from '../src/models/review.model';
import { UserRole, OrderStatus, OrderType } from '../src/types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = `http://localhost:${process.env['PORT'] ?? '5000'}/api`;
const PREFIX = `e2e-${Date.now()}`;

const ADMIN_EMAIL = `${PREFIX}-admin@example.com`;
const KITCHEN_EMAIL = `${PREFIX}-kitchen@example.com`;
const CUSTOMER_EMAIL = `${PREFIX}-customer@example.com`;
const PASSWORD = 'TestPass123!';

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
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const response = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

async function login(email: string, activeRole?: UserRole): Promise<string> {
  const { status, body } = await request('POST', '/auth/login', {
    body: { email, password: PASSWORD, activeRole },
  });
  if (status !== 200) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  return (body['data'] as { token: string }).token;
}

async function ensureUsers(): Promise<void> {
  const hash = await bcrypt.hash(PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      fullName: 'E2E Admin',
      email: ADMIN_EMAIL,
      passwordHash: hash,
      phone: '0500000101',
      roles: [UserRole.ADMIN],
      isActive: true,
    },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: KITCHEN_EMAIL },
    {
      fullName: 'E2E Kitchen',
      email: KITCHEN_EMAIL,
      passwordHash: hash,
      phone: '0500000102',
      roles: [UserRole.KITCHEN],
      isActive: true,
    },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: CUSTOMER_EMAIL },
    {
      fullName: 'E2E Customer',
      email: CUSTOMER_EMAIL,
      passwordHash: hash,
      phone: '0500000103',
      roles: [UserRole.CUSTOMER],
      isActive: true,
    },
    { upsert: true }
  );
}

async function cleanupData(): Promise<void> {
  const customer = await User.findOne({ email: CUSTOMER_EMAIL });
  if (customer) {
    await Cart.deleteMany({ userId: customer._id });
    const orders = await Order.find({ userId: customer._id });
    const orderIds = orders.map((o) => o._id);
    await Review.deleteMany({ order: { $in: orderIds } });
    await Order.deleteMany({ userId: customer._id });
  }
  await Product.deleteMany({ name: { $regex: `^${PREFIX}` } });
  await Category.deleteMany({ name: { $regex: `^${PREFIX}` } });
  await Ingredient.deleteMany({ name: { $regex: `^${PREFIX}` } });
  await DeliveryZone.deleteMany({ city: { $regex: `^${PREFIX}` } });
}

async function cleanupAll(): Promise<void> {
  await cleanupData();
  await User.deleteMany({ email: { $regex: `^${PREFIX}` } });
}

async function runTests(): Promise<void> {
  console.log('\n=== Yummi System E2E Tests ===\n');

  // --- Health & Auth ---
  assert((await request('GET', '/health')).status === 200, 'Health check');
  assert((await request('GET', '/categories')).status === 401, 'Unauthenticated blocked');

  const adminToken = await login(ADMIN_EMAIL, UserRole.ADMIN);
  const kitchenToken = await login(KITCHEN_EMAIL, UserRole.KITCHEN);
  const customerToken = await login(CUSTOMER_EMAIL);

  const me = await request('GET', '/auth/me', { token: customerToken });
  assert(me.status === 200, 'GET /auth/me');

  // --- Catalog setup (admin) ---
  const catRes = await request('POST', '/categories', {
    token: adminToken,
    body: { name: `${PREFIX} Category` },
  });
  assert(catRes.status === 201, 'Create category');
  const categoryId = ((catRes.body['data'] as { category: { id: string } }).category).id;

  const ingOnion = await request('POST', '/ingredients', {
    token: adminToken,
    body: { name: `${PREFIX} Onion` },
  });
  assert(ingOnion.status === 201, 'Create ingredient (onion)');
  const onionId = ((ingOnion.body['data'] as { ingredient: { id: string } }).ingredient).id;

  const ingTomato = await request('POST', '/ingredients', {
    token: adminToken,
    body: { name: `${PREFIX} Tomato` },
  });
  assert(ingTomato.status === 201, 'Create ingredient (tomato)');
  const tomatoId = ((ingTomato.body['data'] as { ingredient: { id: string } }).ingredient).id;

  const prodRes = await request('POST', '/products', {
    token: adminToken,
    body: {
      name: `${PREFIX} Pizza`,
      price: 40,
      categories: [categoryId],
      allowedExtras: [onionId, tomatoId],
      freeExtrasCount: 1,
      pricePerExtra: 5,
    },
  });
  assert(prodRes.status === 201, 'Create product with add-ons');
  const productId = ((prodRes.body['data'] as { product: { id: string } }).product).id;

  const zoneRes = await request('POST', '/delivery-zones', {
    token: adminToken,
    body: {
      city: `${PREFIX} City`,
      deliveryPrice: 15,
      estimatedDeliveryMinutes: 30,
    },
  });
  assert(zoneRes.status === 201, 'Create delivery zone');
  const cityName = ((zoneRes.body['data'] as { zone: { city: string } }).zone).city;

  // --- Business hours ---
  const isOpen = await request('GET', '/business-hours/is-open', { token: customerToken });
  assert(isOpen.status === 200, 'GET is-open');
  const openData = isOpen.body['data'] as { isOpen: boolean };
  if (!openData.isOpen) {
    console.warn('  WARN: Business is closed — order tests may fail');
  }

  // --- Cart with add-ons ---
  const customer = await User.findOne({ email: CUSTOMER_EMAIL });
  if (customer) await Cart.findOneAndUpdate({ userId: customer._id }, { items: [] });

  const addCart = await request('POST', '/cart/items', {
    token: customerToken,
    body: { productId, quantity: 1, selectedExtras: [onionId, tomatoId] },
  });
  assert(addCart.status === 200, 'Add to cart with add-ons');
  const cartData = addCart.body['data'] as { cart: { items: unknown[] } };
  assert(cartData.cart.items.length === 1, 'Cart has one line item');

  const badExtra = await request('POST', '/cart/items', {
    token: customerToken,
    body: {
      productId,
      quantity: 1,
      selectedExtras: ['000000000000000000000000'],
    },
  });
  assert(badExtra.status === 400, 'Invalid add-on rejected');

  // --- Order placement (delivery) ---
  const orderRes = await request('POST', '/orders', {
    token: customerToken,
    body: {
      orderType: OrderType.DELIVERY,
      deliveryCity: cityName,
      deliveryAddress: 'Test Street 1',
    },
  });
  assert(orderRes.status === 201, 'Place delivery order');
  const order = (orderRes.body['data'] as { order: Record<string, unknown> }).order;
  const orderId = order['_id'] as string;
  assert(order['status'] === OrderStatus.RECEIVED, 'New order status is RECEIVED');
  assert(
    Array.isArray((order['items'] as { selectedExtras: unknown[] }[])[0]?.selectedExtras) &&
      (order['items'] as { selectedExtras: unknown[] }[])[0].selectedExtras.length === 2,
    'Order snapshots add-ons'
  );
  assert((order['total'] as number) > (order['subtotal'] as number), 'Delivery fee applied');

  // --- Order lifecycle ---
  const toApproved = await request('PATCH', `/orders/${orderId}/status`, {
    token: kitchenToken,
    body: { status: OrderStatus.APPROVED },
  });
  assert(toApproved.status === 200, 'Kitchen: RECEIVED → APPROVED');

  const toPrep = await request('PATCH', `/orders/${orderId}/status`, {
    token: kitchenToken,
    body: { status: OrderStatus.IN_PREPARATION },
  });
  assert(toPrep.status === 200, 'Kitchen: APPROVED → IN_PREPARATION');

  const toReady = await request('PATCH', `/orders/${orderId}/status`, {
    token: kitchenToken,
    body: { status: OrderStatus.READY },
  });
  assert(toReady.status === 200, 'Kitchen: IN_PREPARATION → READY');

  const toComplete = await request('PATCH', `/orders/${orderId}/status`, {
    token: kitchenToken,
    body: { status: OrderStatus.COMPLETED },
  });
  assert(toComplete.status === 200, 'Kitchen: READY → COMPLETED');

  const badTransition = await request('PATCH', `/orders/${orderId}/status`, {
    token: kitchenToken,
    body: { status: OrderStatus.APPROVED },
  });
  assert(badTransition.status === 400, 'Invalid status transition rejected');

  // --- Notifications ---
  const notifs = await request('GET', '/notifications', { token: customerToken });
  assert(notifs.status === 200, 'List notifications');
  const notifList = (notifs.body['data'] as { notifications: unknown[] }).notifications;
  assert(notifList.length > 0, 'Customer received notifications');

  // --- Review ---
  const reviewRes = await request('POST', '/reviews', {
    token: customerToken,
    body: { orderId, rating: 5, comment: 'Great!' },
  });
  assert(reviewRes.status === 201, 'Create review for completed order');

  const dupReview = await request('POST', '/reviews', {
    token: customerToken,
    body: { orderId, rating: 4 },
  });
  assert(dupReview.status === 409, 'Duplicate review rejected');

  // --- Stats ---
  const stats = await request('GET', '/stats', { token: adminToken });
  assert(stats.status === 200, 'Admin stats dashboard');
  const statsData = stats.body['data'] as { stats: { totalOrders: number } };
  assert(typeof statsData.stats.totalOrders === 'number', 'Stats returns totalOrders');

  const statsForbidden = await request('GET', '/stats', { token: customerToken });
  assert(statsForbidden.status === 403, 'Stats forbidden for customer');

  // --- Cancel flow (separate order) ---
  await request('POST', '/cart/items', {
    token: customerToken,
    body: { productId, quantity: 1, selectedExtras: [] },
  });
  const pickupOrder = await request('POST', '/orders', {
    token: customerToken,
    body: { orderType: OrderType.PICKUP },
  });
  assert(pickupOrder.status === 201, 'Place pickup order for cancel test');
  const pickupId = ((pickupOrder.body['data'] as { order: { _id: string } }).order)._id;

  const cancel = await request('POST', `/orders/${pickupId}/cancel`, {
    token: customerToken,
    body: { reason: 'Changed my mind' },
  });
  assert(cancel.status === 200, 'Cancel order while RECEIVED');
  const cancelled = (cancel.body['data'] as { order: { status: string } }).order;
  assert(cancelled.status === OrderStatus.CANCELLED, 'Cancelled status set');

  // --- My orders ---
  const myOrders = await request('GET', '/orders/my', { token: customerToken });
  assert(myOrders.status === 200, 'GET /orders/my');
  const orders = (myOrders.body['data'] as { orders: unknown[] }).orders;
  assert(orders.length >= 2, 'Customer sees order history');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  await mongoose.connect(process.env['MONGO_URI'] as string);
  await ensureUsers();
  await cleanupData();
  try {
    await runTests();
  } finally {
    await cleanupAll();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('E2E run failed:', err);
  process.exit(1);
});
