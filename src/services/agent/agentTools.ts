import Joi from 'joi';
import { Types } from 'mongoose';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { Product, IProduct } from '../../models/product.model';
import { Ingredient } from '../../models/ingredient.model';
import { ICart } from '../../models/cart.model';
import { Order, IOrder } from '../../models/order.model';
import { User } from '../../models/user.model';
import { categoryService } from '../category.service';
import { businessHoursService } from '../businessHours.service';
import { statsService } from '../stats.service';
import { orderService } from '../order.service';
import { cartService } from '../cart.service';
import { OrderStatus, OrderType, UserRole } from '../../types';
import { ApiError } from '../../utils/ApiError';

/**
 * AI agent tools.
 *
 * Tools are split into read-only lookups (menu, orders, hours, stats) and
 * customer actions (cart + order management). Every action reuses the existing
 * domain services so business rules, validation, and socket events stay intact.
 *
 * SECURITY MODEL
 * --------------
 * - The authenticated identity ({@link ToolContext}) is injected by the server
 *   from the verified JWT. The LLM can NEVER supply a userId/role, so it can
 *   only ever read or mutate the CURRENT user's own cart and orders.
 * - Action tools (add to cart, place order, cancel, ...) are CUSTOMER-only and
 *   are hidden from other roles, then re-authorized at execution time.
 * - Arguments produced by the model are validated with Joi before use.
 * - Products/add-ons are resolved from names to ids server-side against the
 *   live catalog; the model cannot inject arbitrary ids or bypass availability.
 */

/** Identity injected by the server (from the JWT) — never taken from the model. */
export interface ToolContext {
  userId: string;
  activeRole: UserRole;
}

interface AgentTool {
  /** OpenAI function-calling definition exposed to the model. */
  definition: ChatCompletionTool;
  /** Joi schema validating the model-supplied arguments. */
  argsSchema: Joi.ObjectSchema;
  /** Roles allowed to invoke this tool; `undefined` means any authenticated role. */
  allowedRoles?: UserRole[];
  /** Executes the tool against validated args and the trusted server context. */
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

const MENU_MAX_PRODUCTS = 100;
const ORDERS_MAX_LIMIT = 20;
const CART_MAX_QUANTITY = 50;

/**
 * Groq/Llama often emit numeric tool args as strings. Accept both in Joi;
 * tool JSON schemas use `string` so Groq's pre-validation does not reject calls.
 */
function positiveIntSchema(max: number, defaultValue?: number) {
  let schema = Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(max),
      Joi.string().pattern(/^\d+$/),
      Joi.valid(null)
    )
    .custom((value, helpers) => {
      if (value === null || value === undefined) {
        return defaultValue ?? helpers.error('any.invalid');
      }
      const n = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!Number.isInteger(n) || n < 1 || n > max) {
        return helpers.error('any.invalid');
      }
      return n;
    });
  if (defaultValue !== undefined) {
    schema = schema.default(defaultValue);
  }
  return schema;
}

/** Groq often sends `null` for optional arrays — treat as empty. */
function optionalStringArraySchema(maxItems = 20) {
  return Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(100)).max(maxItems), Joi.valid(null))
    .default([])
    .custom((value) => (value === null ? [] : value));
}

/** Hebrew/English search variants (e.g. "מגשי" → also try "מגש"). */
function tokenVariants(token: string): string[] {
  const variants = new Set<string>([token]);
  if (token.length > 2 && token.endsWith('י')) {
    variants.add(token.slice(0, -1));
  }
  if (token.length > 3 && token.endsWith('ים')) {
    variants.add(token.slice(0, -2));
  }
  if (token.length > 3 && token.endsWith('ות')) {
    variants.add(token.slice(0, -2));
  }
  return [...variants];
}

function productMatchesQuery(productName: string, query: string): boolean {
  const name = productName.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) {
    return false;
  }
  if (name.includes(q) || q.includes(name)) {
    return true;
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((token) => tokenVariants(token).some((variant) => name.includes(variant)));
}

/** Populated cart shapes (productId / selectedExtras resolved by the service). */
interface PopulatedCartProduct {
  _id: Types.ObjectId;
  name?: string;
  price?: number;
}
interface PopulatedCartExtra {
  _id: Types.ObjectId;
  name?: string;
}

/**
 * Resolves a single AVAILABLE product from a (partial) name.
 * Supports Hebrew plural forms and multi-word partial matches.
 */
async function resolveProduct(rawName: string): Promise<IProduct> {
  const name = rawName.trim();
  const allAvailable = await Product.find({
    isDeleted: false,
    isAvailable: true,
  })
    .sort({ name: 1 })
    .limit(MENU_MAX_PRODUCTS);

  if (allAvailable.length === 0) {
    throw ApiError.notFound('No products are currently available');
  }

  const exact = allAvailable.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exact) {
    return exact;
  }

  const matches = allAvailable.filter((p) => productMatchesQuery(p.name, name));
  if (matches.length === 0) {
    const available = allAvailable
      .slice(0, 15)
      .map((p) => p.name)
      .join(', ');
    throw ApiError.notFound(
      `No available product matches "${name}". Available products include: ${available}. ` +
        'Use the exact product name from this list.'
    );
  }
  if (matches.length > 1) {
    const names = matches.map((p) => p.name).join(', ');
    throw ApiError.badRequest(
      `"${name}" matches several products: ${names}. Ask the user which one they want.`
    );
  }

  return matches[0];
}

/**
 * Resolves add-on names to ingredient ids, restricted to the product's
 * configured `allowedExtras`. Rejects unknown or not-allowed add-ons.
 */
async function resolveExtras(product: IProduct, names: string[]): Promise<string[]> {
  if (names.length === 0) {
    return [];
  }
  if (product.allowedExtras.length === 0) {
    throw ApiError.badRequest(`"${product.name}" does not support add-ons`);
  }

  const allowed = await Ingredient.find({ _id: { $in: product.allowedExtras } });
  const byName = new Map(allowed.map((ing) => [ing.name.toLowerCase(), ing._id.toString()]));

  const ids: string[] = [];
  for (const raw of names) {
    const id = byName.get(raw.trim().toLowerCase());
    if (!id) {
      const options = allowed.map((i) => i.name).join(', ') || 'none';
      throw ApiError.badRequest(
        `Add-on "${raw}" is not available for "${product.name}". Allowed add-ons: ${options}`
      );
    }
    ids.push(id);
  }
  return ids;
}

/** Serializes a cart into a compact, model-friendly summary. */
function summarizeCart(cart: ICart): {
  itemCount: number;
  items: { product: string; quantity: number; extras: string[] }[];
} {
  const items = cart.items.map((item) => {
    const product = item.productId as unknown as PopulatedCartProduct;
    const extras = (item.selectedExtras as unknown as PopulatedCartExtra[]) ?? [];
    return {
      product: product?.name ?? 'Unknown product',
      quantity: item.quantity,
      extras: extras.map((e) => e.name).filter((n): n is string => Boolean(n)),
    };
  });
  return { itemCount: items.reduce((sum, i) => sum + i.quantity, 0), items };
}

/**
 * Finds the single cart line matching a product name and returns the ids
 * needed to update/remove it (including its current add-ons). Throws when the
 * product is absent or ambiguous (same product present with different add-ons).
 */
async function findCartLine(
  userId: string,
  productName: string
): Promise<{ productId: string; extraIds: string[] }> {
  const cart = await cartService.getCart(userId);
  const target = productName.trim().toLowerCase();

  const matches = cart.items.filter((item) => {
    const product = item.productId as unknown as PopulatedCartProduct;
    return product?.name?.toLowerCase().includes(target);
  });

  if (matches.length === 0) {
    throw ApiError.notFound(`"${productName}" is not in your cart`);
  }
  if (matches.length > 1) {
    throw ApiError.badRequest(
      `"${productName}" appears multiple times with different add-ons. ` +
        'Ask the user to manage it from the cart page.'
    );
  }

  const line = matches[0];
  const product = line.productId as unknown as PopulatedCartProduct;
  const extras = (line.selectedExtras as unknown as PopulatedCartExtra[]) ?? [];
  return {
    productId: product._id.toString(),
    extraIds: extras.map((e) => e._id.toString()),
  };
}

/**
 * getMenu — public catalog overview: active categories plus available products.
 * Optional case-insensitive filter by category name.
 */
const getMenu: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getMenu',
      description:
        'Get the current food menu: active categories and their available products with prices. ' +
        'Use this to answer questions about what can be ordered, prices, and categories.',
      parameters: {
        type: 'object',
        properties: {
          categoryName: {
            type: 'string',
            description: 'Optional. Filter products to a single category by (partial) name.',
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    categoryName: Joi.string().trim().max(100).optional(),
  }),
  async execute(args) {
    const categories = await categoryService.list();
    const products = await Product.find({ isDeleted: false, isAvailable: true })
      .select('name price categories')
      .limit(MENU_MAX_PRODUCTS)
      .sort({ name: 1 });

    const categoryNameFilter = (args['categoryName'] as string | undefined)?.toLowerCase();
    const filteredCategories = categoryNameFilter
      ? categories.filter((c) => c.name.toLowerCase().includes(categoryNameFilter))
      : categories;
    const allowedCategoryIds = new Set(filteredCategories.map((c) => c.id));

    return {
      categories: filteredCategories.map((c) => ({ id: c.id, name: c.name })),
      products: products
        .filter((p) =>
          categoryNameFilter
            ? p.categories.some((id) => allowedCategoryIds.has(id.toString()))
            : true
        )
        .map((p) => ({
          name: p.name,
          price: p.price,
        })),
    };
  },
};

/**
 * getMyOrders — the authenticated user's own orders. Strictly scoped to the
 * JWT userId; the model cannot request another user's orders.
 */
const getMyOrders: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getMyOrders',
      description:
        "Get the current signed-in user's own recent orders (status, total, type, date). " +
        'Use for questions like "where is my order" or "what did I order".',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: Object.values(OrderStatus),
            description: 'Optional. Only return orders with this status.',
          },
          limit: {
            type: 'string',
            description: `Optional. Max orders to return (1-${ORDERS_MAX_LIMIT}). Defaults to "5".`,
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .optional(),
    limit: positiveIntSchema(ORDERS_MAX_LIMIT, 5).optional(),
  }),
  async execute(args, ctx) {
    const status = args['status'] as OrderStatus | undefined;
    const limit = (args['limit'] as number | undefined) ?? 5;

    const orders = await orderService.getOrdersByUser(ctx.userId);
    return orders
      .filter((order) => (status ? order.status === status : true))
      .slice(0, limit)
      .map((order) => ({
        id: order._id.toString(),
        status: order.status,
        type: order.orderType,
        total: order.total,
        itemCount: order.items.length,
        items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
        createdAt: order.createdAt,
      }));
  },
};

/**
 * getBusinessHours — whether the shop is open now plus the weekly schedule.
 */
const getBusinessHours: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getBusinessHours',
      description:
        'Check whether the restaurant is currently open and get the weekly opening schedule.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  argsSchema: Joi.object({}),
  async execute() {
    const [openNow, hours] = await Promise.all([
      businessHoursService.isOpenNow(),
      businessHoursService.get(),
    ]);
    return {
      isOpen: openNow.isOpen,
      reason: openNow.reason,
      currentTime: openNow.currentTime,
      weeklySchedule: hours.weeklySchedule,
    };
  },
};

/**
 * getSalesSummary — ADMIN-only aggregated dashboard figures.
 */
const getSalesSummary: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getSalesSummary',
      description:
        'ADMIN ONLY. Get aggregated business statistics: total orders, monthly revenue, ' +
        'most-sold products, average rating, and total cancellations.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  argsSchema: Joi.object({}),
  allowedRoles: [UserRole.ADMIN],
  async execute() {
    return statsService.getDashboard();
  },
};

/**
 * viewCart — the current customer's cart contents.
 */
const viewCart: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'viewCart',
      description:
        "View the customer's cart items, quantities, and product names. " +
        'Call this before updateCartItem so you know the current quantity.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  argsSchema: Joi.object({}),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(_args, ctx) {
    const cart = await cartService.getCart(ctx.userId);
    return summarizeCart(cart);
  },
};

/**
 * addToCart — add an available product (with optional add-ons) to the cart.
 * Product and add-on names are resolved to ids against the live catalog.
 */
const addToCart: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'addToCart',
      description:
        "Add a product to the customer's cart. You MUST call getMenu first and use the EXACT " +
        'product name returned by getMenu (do not translate or guess the name). ' +
        'Optionally include add-on names and a quantity.',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: 'The exact product name as returned by getMenu.',
          },
          quantity: {
            type: 'string',
            description: `Quantity to add (1-${CART_MAX_QUANTITY}). Defaults to "1".`,
          },
          extras: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional add-on names, which must be allowed for the product.',
          },
        },
        required: ['productName'],
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    productName: Joi.string().trim().min(1).max(150).required(),
    quantity: positiveIntSchema(CART_MAX_QUANTITY, 1),
    extras: optionalStringArraySchema(),
  }),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(args, ctx) {
    const product = await resolveProduct(args['productName'] as string);
    const extraIds = await resolveExtras(product, (args['extras'] as string[]) ?? []);
    const quantity = (args['quantity'] as number | undefined) ?? 1;

    const cart = await cartService.addItem(ctx.userId, {
      productId: product._id.toString(),
      quantity,
      selectedExtras: extraIds,
    });

    return { added: product.name, quantity, cart: summarizeCart(cart) };
  },
};

/**
 * updateCartItem — change the quantity of an existing cart line (by product name).
 */
const updateCartItem: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'updateCartItem',
      description:
        'Set the ABSOLUTE quantity of a product in the cart (not a delta). ' +
        'Call viewCart first to see current quantities. ' +
        'To reduce by 1: set quantity = current_quantity - 1. ' +
        'If the new quantity would be 0, use removeFromCart instead.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Name of the product in the cart.' },
          quantity: {
            type: 'string',
            description: `The new absolute quantity (1-${CART_MAX_QUANTITY}).`,
          },
        },
        required: ['productName', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    productName: Joi.string().trim().min(1).max(150).required(),
    quantity: positiveIntSchema(CART_MAX_QUANTITY).required(),
  }),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(args, ctx) {
    const { productId, extraIds } = await findCartLine(ctx.userId, args['productName'] as string);
    const cart = await cartService.updateItem(ctx.userId, productId, {
      quantity: args['quantity'] as number,
      selectedExtras: extraIds,
    });
    return { updated: args['productName'], cart: summarizeCart(cart) };
  },
};

/**
 * removeFromCart — remove a product line from the cart (by product name).
 */
const removeFromCart: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'removeFromCart',
      description:
        "Completely remove a product line from the customer's cart. " +
        'Use this when the user wants to remove an item entirely or reduce quantity to 0.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Name of the product to remove.' },
        },
        required: ['productName'],
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    productName: Joi.string().trim().min(1).max(150).required(),
  }),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(args, ctx) {
    const { productId, extraIds } = await findCartLine(ctx.userId, args['productName'] as string);
    const cart = await cartService.removeItem(ctx.userId, productId, extraIds);
    return { removed: args['productName'], cart: summarizeCart(cart) };
  },
};

/**
 * placeOrder — turn the current cart into an order.
 *
 * Delegates to the order service, which enforces business hours, cart-not-empty,
 * and (for delivery) supported-city + address rules. The model is instructed to
 * confirm with the user before calling this tool.
 */
const placeOrder: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'placeOrder',
      description:
        "Place an order from the customer's current cart. Confirm the details with the user " +
        'before calling. For DELIVERY, provide a city and address, or set useDefaultAddress ' +
        'to use the saved profile address.',
      parameters: {
        type: 'object',
        properties: {
          orderType: {
            type: 'string',
            enum: Object.values(OrderType),
            description: 'PICKUP (default) or DELIVERY.',
          },
          useDefaultAddress: {
            type: 'boolean',
            description: 'For DELIVERY only: use the address saved on the profile.',
          },
          deliveryCity: { type: 'string', description: 'For DELIVERY only: destination city.' },
          deliveryAddress: {
            type: 'string',
            description: 'For DELIVERY only: full street address.',
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    orderType: Joi.string()
      .valid(...Object.values(OrderType))
      .default(OrderType.PICKUP),
    useDefaultAddress: Joi.boolean().optional(),
    deliveryCity: Joi.string().trim().min(2).max(100).optional(),
    deliveryAddress: Joi.string().trim().min(2).max(500).optional(),
  }),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(args, ctx) {
    const order = await orderService.createFromCart(ctx.userId, {
      orderType: args['orderType'] as OrderType,
      useDefaultAddress: args['useDefaultAddress'] as boolean | undefined,
      deliveryCity: args['deliveryCity'] as string | undefined,
      deliveryAddress: args['deliveryAddress'] as string | undefined,
    });

    return {
      orderId: order._id.toString(),
      status: order.status,
      type: order.orderType,
      total: order.total,
      itemCount: order.items.length,
    };
  },
};

/**
 * cancelMyOrder — cancel one of the customer's own orders (RECEIVED only).
 */
const cancelMyOrder: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'cancelMyOrder',
      description:
        "Cancel one of the customer's own orders. Only allowed while the order is still RECEIVED. " +
        'A reason is required. Confirm with the user before calling. Get the orderId from getMyOrders.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The id of the order to cancel.' },
          reason: { type: 'string', description: 'Why the order is being cancelled.' },
        },
        required: ['orderId', 'reason'],
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
    reason: Joi.string().trim().min(3).max(500).required(),
  }),
  allowedRoles: [UserRole.CUSTOMER],
  async execute(args, ctx) {
    const order = await orderService.cancelOrder(
      ctx.userId,
      args['orderId'] as string,
      args['reason'] as string
    );
    return { orderId: order._id.toString(), status: order.status };
  },
};

/* ------------------------------------------------------------------ *
 * Employee order-management tools (KITCHEN / DELIVERY / ADMIN)
 * ------------------------------------------------------------------ */

/**
 * Resolves a human-facing order reference to a full order id.
 * Accepts either the full 24-char ObjectId or the short 6-character code
 * shown in the UI (e.g. "#A3F4C2" / "a3f4c2"). Throws if not found/ambiguous.
 */
async function resolveOrderId(rawRef: string): Promise<string> {
  const ref = rawRef.trim().replace(/^#/, '');

  if (/^[0-9a-fA-F]{24}$/.test(ref)) {
    const exists = await Order.exists({ _id: ref });
    if (!exists) {
      throw ApiError.notFound(`No order found with id ${ref}`);
    }
    return ref;
  }

  if (/^[0-9a-fA-F]{6}$/.test(ref)) {
    const suffix = ref.toLowerCase();
    const candidates = await Order.find().select('_id').sort({ createdAt: -1 }).limit(500);
    const matches = candidates.filter((o) => o._id.toString().toLowerCase().endsWith(suffix));
    if (matches.length === 0) {
      throw ApiError.notFound(`No order found matching "#${ref.toUpperCase()}"`);
    }
    if (matches.length > 1) {
      throw ApiError.badRequest(
        `"#${ref.toUpperCase()}" matches several orders. Ask the user for the full order id.`
      );
    }
    return matches[0]._id.toString();
  }

  throw ApiError.badRequest(
    `"${rawRef}" is not a valid order reference. Use the 6-character order code (e.g. #A3F4C2).`
  );
}

/** Serializes orders into a compact, model-friendly list with customer names. */
async function summarizeOrders(orders: IOrder[], limit: number) {
  const sliced = orders.slice(0, limit);
  const userIds = [...new Set(sliced.map((o) => (o.userId as Types.ObjectId).toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select('fullName');
  const nameById = new Map(users.map((u) => [u._id.toString(), u.fullName]));

  return sliced.map((o) => ({
    ref: o._id.toString().slice(-6).toUpperCase(),
    id: o._id.toString(),
    status: o.status,
    type: o.orderType,
    total: o.total,
    customer: nameById.get((o.userId as Types.ObjectId).toString()) ?? 'Unknown',
    items: o.items.map((it) => ({ name: it.name, quantity: it.quantity })),
    createdAt: o.createdAt,
  }));
}

/** Target statuses each employee role is allowed to set. */
const ROLE_ALLOWED_STATUSES: Partial<Record<UserRole, OrderStatus[]>> = {
  [UserRole.KITCHEN]: [OrderStatus.APPROVED, OrderStatus.IN_PREPARATION, OrderStatus.READY],
  [UserRole.DELIVERY]: [OrderStatus.COMPLETED],
  [UserRole.ADMIN]: [
    OrderStatus.APPROVED,
    OrderStatus.IN_PREPARATION,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
};

/**
 * getKitchenOrders — the kitchen queue (RECEIVED / APPROVED / IN_PREPARATION),
 * oldest first, so the agent can find an order without the user describing it.
 */
const getKitchenOrders: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getKitchenOrders',
      description:
        'Get the kitchen queue: orders that are RECEIVED, APPROVED, or IN_PREPARATION (oldest first). ' +
        'Each order includes a short "ref" code (as shown on screen), items, customer, and status. ' +
        'Use this to locate an order the user refers to before changing its status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: [OrderStatus.RECEIVED, OrderStatus.APPROVED, OrderStatus.IN_PREPARATION],
            description: 'Optional. Only return orders with this status.',
          },
          limit: {
            type: 'string',
            description: `Optional. Max orders to return (1-${ORDERS_MAX_LIMIT}). Defaults to "20".`,
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    status: Joi.string()
      .valid(OrderStatus.RECEIVED, OrderStatus.APPROVED, OrderStatus.IN_PREPARATION)
      .optional(),
    limit: positiveIntSchema(ORDERS_MAX_LIMIT, ORDERS_MAX_LIMIT).optional(),
  }),
  allowedRoles: [UserRole.KITCHEN, UserRole.ADMIN],
  async execute(args) {
    const status = args['status'] as OrderStatus | undefined;
    const limit = (args['limit'] as number | undefined) ?? ORDERS_MAX_LIMIT;
    const orders = await orderService.getKitchenOrders();
    const filtered = status ? orders.filter((o) => o.status === status) : orders;
    return { orders: await summarizeOrders(filtered, limit) };
  },
};

/**
 * getDeliveryOrders — orders that are READY for pickup/delivery, oldest first.
 */
const getDeliveryOrders: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getDeliveryOrders',
      description:
        'Get the delivery/pickup queue: orders that are READY (oldest first). ' +
        'Each order includes a short "ref" code, items, customer, type, and address (for delivery).',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: `Optional. Max orders to return (1-${ORDERS_MAX_LIMIT}). Defaults to "20".`,
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    limit: positiveIntSchema(ORDERS_MAX_LIMIT, ORDERS_MAX_LIMIT).optional(),
  }),
  allowedRoles: [UserRole.DELIVERY, UserRole.ADMIN],
  async execute(args) {
    const limit = (args['limit'] as number | undefined) ?? ORDERS_MAX_LIMIT;
    const orders = await orderService.getDeliveryOrders();
    return { orders: await summarizeOrders(orders, limit) };
  },
};

/**
 * getAllOrders — ADMIN-only view of every order (newest first), optional status filter.
 */
const getAllOrders: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'getAllOrders',
      description:
        'ADMIN ONLY. Get all orders (newest first) with a short "ref" code, customer, items, and status. ' +
        'Optionally filter by status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: Object.values(OrderStatus),
            description: 'Optional. Only return orders with this status.',
          },
          limit: {
            type: 'string',
            description: `Optional. Max orders to return (1-${ORDERS_MAX_LIMIT}). Defaults to "20".`,
          },
        },
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .optional(),
    limit: positiveIntSchema(ORDERS_MAX_LIMIT, ORDERS_MAX_LIMIT).optional(),
  }),
  allowedRoles: [UserRole.ADMIN],
  async execute(args) {
    const status = args['status'] as OrderStatus | undefined;
    const limit = (args['limit'] as number | undefined) ?? ORDERS_MAX_LIMIT;
    const orders = await orderService.getAllOrders();
    const filtered = status ? orders.filter((o) => o.status === status) : orders;
    return { orders: await summarizeOrders(filtered, limit) };
  },
};

/**
 * updateOrderStatus — advance an order through its lifecycle.
 *
 * Lifecycle: RECEIVED → APPROVED → IN_PREPARATION → READY → COMPLETED.
 * KITCHEN may set APPROVED / IN_PREPARATION / READY.
 * DELIVERY may set COMPLETED.
 * ADMIN may set any of the above (and CANCELLED).
 * The order service validates the transition itself, so illegal jumps are rejected.
 */
const updateOrderStatus: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'updateOrderStatus',
      description:
        "Change an order's status. Provide the order ref (the 6-character code, e.g. A3F4C2) and the " +
        'new status. Lifecycle: RECEIVED → APPROVED → IN_PREPARATION → READY → COMPLETED. ' +
        'Map user intent to a status: "approve" = APPROVED, "start preparing" = IN_PREPARATION, ' +
        '"ready" = READY, "complete/delivered/picked up" = COMPLETED. ' +
        'If unsure which order, call getKitchenOrders or getDeliveryOrders first to find its ref.',
      parameters: {
        type: 'object',
        properties: {
          orderRef: {
            type: 'string',
            description: 'The order reference: the 6-character code (e.g. A3F4C2) or full order id.',
          },
          newStatus: {
            type: 'string',
            enum: Object.values(OrderStatus),
            description: 'The status to set the order to.',
          },
        },
        required: ['orderRef', 'newStatus'],
        additionalProperties: false,
      },
    },
  },
  argsSchema: Joi.object({
    orderRef: Joi.string().trim().min(6).max(30).required(),
    newStatus: Joi.string()
      .valid(...Object.values(OrderStatus))
      .required(),
  }),
  allowedRoles: [UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN],
  async execute(args, ctx) {
    const newStatus = args['newStatus'] as OrderStatus;

    const allowed = ROLE_ALLOWED_STATUSES[ctx.activeRole] ?? [];
    if (!allowed.includes(newStatus)) {
      throw ApiError.forbidden(
        `Role ${ctx.activeRole} is not allowed to set an order to ${newStatus}.`
      );
    }

    const orderId = await resolveOrderId(args['orderRef'] as string);
    const order = await orderService.updateOrderStatus(orderId, newStatus);

    return {
      ref: order._id.toString().slice(-6).toUpperCase(),
      id: order._id.toString(),
      status: order.status,
      type: order.orderType,
    };
  },
};

const TOOLS: Record<string, AgentTool> = {
  getMenu,
  getMyOrders,
  getBusinessHours,
  getSalesSummary,
  viewCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  placeOrder,
  cancelMyOrder,
  getKitchenOrders,
  getDeliveryOrders,
  getAllOrders,
  updateOrderStatus,
};

/**
 * OpenAI tool definitions the model is allowed to see for a given role.
 * Role-restricted tools are hidden from users who cannot use them, so the
 * model never even attempts an unauthorized call.
 */
export function getToolDefinitions(role: UserRole): ChatCompletionTool[] {
  return Object.values(TOOLS)
    .filter((tool) => !tool.allowedRoles || tool.allowedRoles.includes(role))
    .map((tool) => tool.definition);
}

/**
 * Safely executes a tool the model requested.
 *
 * Enforces the allow-list, role authorization, and Joi argument validation.
 * Returns a plain object suitable for serialization back to the model.
 */
export async function executeTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext
): Promise<unknown> {
  const tool = TOOLS[name];
  if (!tool) {
    throw ApiError.badRequest(`Unknown tool: ${name}`);
  }

  if (tool.allowedRoles && !tool.allowedRoles.includes(ctx.activeRole)) {
    throw ApiError.forbidden(`Role ${ctx.activeRole} is not permitted to use tool ${name}`);
  }

  const argsObject =
    rawArgs && typeof rawArgs === 'object' ? (rawArgs as Record<string, unknown>) : {};

  const { error, value } = tool.argsSchema.validate(argsObject, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw ApiError.badRequest(
      `Invalid arguments for tool ${name}`,
      error.details.map((d) => d.message)
    );
  }

  return tool.execute(value, ctx);
}
