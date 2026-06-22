# Yummi API Reference

Base URL: `/api`  
All authenticated routes require: `Authorization: Bearer <token>`

---

## Health Check

| Method | Path | Auth | Roles | Body |
|--------|------|------|-------|------|
| GET | `/api/health` | — | — | — |

**Response:** `{ status: "ok", ... }`

---

## Auth — `/api/auth`

### POST `/api/auth/register`
**Auth:** None  
**Body:**
```json
{
  "fullName": "string (2–100)",
  "email": "string (valid email)",
  "password": "string (min 8)",
  "phone": "string (7–20)"
}
```
**Returns:** `{ token, user }` — always registers as `CUSTOMER`

---

### POST `/api/auth/login`
**Auth:** None  
**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Returns:** `{ token, user }` with `activeRole` in JWT

---

### GET `/api/auth/me`
**Auth:** JWT  
**Roles:** Any authenticated  
**Body:** None  
**Returns:** Current user profile (no passwordHash)

---

### PATCH `/api/auth/active-role`
**Auth:** JWT  
**Roles:** Any authenticated  
**Body:**
```json
{
  "activeRole": "CUSTOMER | KITCHEN | DELIVERY | ADMIN"
}
```
**Returns:** New `{ token }` with updated `activeRole` in payload  
**Note:** User must already own the requested role.

---

## Users — `/api/users`

> All user routes require `ADMIN` active role.

### POST `/api/users/employees`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:**
```json
{
  "fullName": "string (2–100)",
  "email": "string (valid email)",
  "password": "string (min 8)",
  "phone": "string (7–20)",
  "roles": ["KITCHEN", "DELIVERY", "ADMIN"]
}
```
**Note:** `CUSTOMER` role is not allowed for employees.

---

### GET `/api/users/employees`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:** None  
**Returns:** List of all employees (non-customer users)

---

### GET `/api/users/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** User document

---

### POST `/api/users/:id/roles/add`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "role": "KITCHEN | DELIVERY | ADMIN | CUSTOMER"
}
```

---

### DELETE `/api/users/:id/roles/:role`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId, `role` — one of `KITCHEN | DELIVERY | ADMIN | CUSTOMER`  
**Body:** None

---

### PATCH `/api/users/:id/roles`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "roles": ["KITCHEN", "DELIVERY"]
}
```

---

### PATCH `/api/users/:id/status`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "isActive": true
}
```

---

## Categories — `/api/categories`

> **Catalog browsing flow:** The catalog is organized by category. There is no flat `GET /api/products` list.
> 1. `GET /api/categories` — list categories
> 2. `GET /api/categories/:id/products` — list products in a category
> 3. `GET /api/products/:id` — product detail (ingredients, extras, price)

### GET `/api/categories`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Body:** None  
**Returns:** List of all non-deleted categories

---

### GET `/api/categories/:id`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** Single category document

---

### GET `/api/categories/:id/products`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** All non-deleted products belonging to this category

---

### POST `/api/categories`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:**
```json
{
  "name": "string (2–100, unique)",
  "description": "string (max 500) [optional]",
  "image": "string URL (max 2048) [optional]"
}
```

---

### PATCH `/api/categories/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** (all fields optional)
```json
{
  "name": "string (2–100)",
  "description": "string (max 500)",
  "image": "string URL (max 2048)"
}
```

---

### DELETE `/api/categories/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Note:** Soft delete only. Fails if the category has active (non-deleted) products.

---

## Products — `/api/products`

> Products are not listed here as a standalone catalog. Browse them through categories (`GET /api/categories/:id/products`). These routes are for product detail and admin management.

### GET `/api/products/:id`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** Product with populated `categories`, `ingredients`, `allowedExtras`

---

### POST `/api/products`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:**
```json
{
  "name": "string (2–150)",
  "price": "number (≥ 0)",
  "categories": ["ObjectId", "..."],
  "description": "string (max 1000) [optional]",
  "image": "string URL (max 2048) [optional]",
  "ingredients": ["ObjectId", "..."] "[optional]",
  "allowedExtras": ["ObjectId", "..."] "[optional]",
  "freeExtrasCount": "number (≥ 0) [optional, default 0]",
  "pricePerExtra": "number (≥ 0) [optional, default 0]"
}
```

---

### PATCH `/api/products/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** (all fields optional)
```json
{
  "name": "string (2–150)",
  "price": "number (≥ 0)",
  "categories": ["ObjectId", "..."],
  "description": "string (max 1000)",
  "image": "string URL (max 2048)",
  "ingredients": ["ObjectId", "..."],
  "allowedExtras": ["ObjectId", "..."],
  "freeExtrasCount": "number (≥ 0)",
  "pricePerExtra": "number (≥ 0)"
}
```

---

### PATCH `/api/products/:id/availability`
**Auth:** JWT  
**Roles:** `ADMIN`, `KITCHEN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "isAvailable": true
}
```
**Note:** Emits `PRODUCT_AVAILABILITY_CHANGED` socket event.

---

### DELETE `/api/products/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Note:** Soft delete only.

---

## Ingredients — `/api/ingredients`

### GET `/api/ingredients`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Body:** None  
**Returns:** List of all ingredients

---

### GET `/api/ingredients/:id`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** Single ingredient document

---

### POST `/api/ingredients`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:**
```json
{
  "name": "string (2–100, unique, case-insensitive)"
}
```

---

### PATCH `/api/ingredients/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "name": "string (2–100)"
}
```

---

### PATCH `/api/ingredients/:id/status`
**Auth:** JWT  
**Roles:** `KITCHEN`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "status": "AVAILABLE | TEMPORARILY_UNAVAILABLE"
}
```
**Note:** Emits `INGREDIENT_AVAILABILITY_CHANGED` socket event.

---

### DELETE `/api/ingredients/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Note:** Hard delete. Blocked if the ingredient is referenced by any product.

---

## Delivery Zones — `/api/delivery-zones`

> Manages the cities where delivery is available. Used by order placement to validate delivery orders and calculate the delivery fee.
>
> **Admin view** (`GET /`) returns all zones including inactive ones.  
> **All other roles** see only active zones.

### GET `/api/delivery-zones`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Body:** None  
**Returns:** List of delivery zones. ADMIN receives all (including inactive); others receive active only.

---

### GET `/api/delivery-zones/city/:city`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `city` — city name (URL-encoded if it contains spaces)  
**Body:** None  
**Returns:** The zone for that city (with `deliveryPrice` and `estimatedDeliveryMinutes`)  
**Note:** Returns `404` if the city is not found or the zone is inactive. Used by order placement to block unsupported cities.

---

### GET `/api/delivery-zones/:id`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Returns:** Single delivery zone document

---

### POST `/api/delivery-zones`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:**
```json
{
  "city": "string (2–100, unique)",
  "deliveryPrice": "number (≥ 0)",
  "estimatedDeliveryMinutes": "integer (≥ 1)"
}
```
**Note:** City names are unique (case-insensitive). Duplicate city returns `409`.

---

### PATCH `/api/delivery-zones/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** (at least one field required)
```json
{
  "city": "string (2–100)",
  "deliveryPrice": "number (≥ 0)",
  "estimatedDeliveryMinutes": "integer (≥ 1)"
}
```

---

### PATCH `/api/delivery-zones/:id/status`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:**
```json
{
  "isActive": true
}
```
**Note:** Temporarily enables or disables deliveries to this city without removing the zone.

---

### DELETE `/api/delivery-zones/:id`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `id` — MongoDB ObjectId  
**Body:** None  
**Note:** Soft delete only — keeps the record for historical order references.

---

## Business Hours — `/api/business-hours`

> All routes require JWT. Admin manages the schedule; all other roles can read it.

---

### GET `/api/business-hours`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Body:** None  
**Returns:** The singleton business-hours document with the full weekly schedule and all special-day overrides.

```json
{
  "success": true,
  "data": {
    "businessHours": {
      "id": "...",
      "weeklySchedule": [
        { "dayOfWeek": 0, "openTime": "09:00", "closeTime": "22:00", "isClosed": true },
        { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "22:00", "isClosed": false }
      ],
      "specialDays": [
        { "date": "2026-12-25", "label": "Christmas", "isClosed": true }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

### GET `/api/business-hours/is-open`
**Auth:** JWT  
**Roles:** `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`  
**Body:** None  
**Returns:** Whether the business is currently open, the reason, current server time, and today's effective schedule entry.  
**Note:** Special-day overrides take precedence over the weekly schedule.

```json
{
  "success": true,
  "data": {
    "isOpen": true,
    "reason": "Open (09:00–22:00)",
    "currentTime": "14:32",
    "todaySchedule": { "dayOfWeek": 6, "openTime": "09:00", "closeTime": "22:00", "isClosed": false }
  }
}
```

---

### PUT `/api/business-hours/weekly-schedule`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:** Full replacement of all 7 day entries. Every `dayOfWeek` (0–6) must appear exactly once.

```json
{
  "weeklySchedule": [
    { "dayOfWeek": 0, "openTime": "10:00", "closeTime": "20:00", "isClosed": true },
    { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "22:00", "isClosed": false },
    { "dayOfWeek": 2, "openTime": "09:00", "closeTime": "22:00", "isClosed": false },
    { "dayOfWeek": 3, "openTime": "09:00", "closeTime": "22:00", "isClosed": false },
    { "dayOfWeek": 4, "openTime": "09:00", "closeTime": "22:00", "isClosed": false },
    { "dayOfWeek": 5, "openTime": "09:00", "closeTime": "22:00", "isClosed": false },
    { "dayOfWeek": 6, "openTime": "10:00", "closeTime": "20:00", "isClosed": false }
  ]
}
```
**Returns:** Updated business-hours document.  
**Errors:** `400` if not exactly 7 entries or duplicate `dayOfWeek`; `openTime`/`closeTime` must be `HH:mm`.

---

### POST `/api/business-hours/special-days`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Body:** Adds or replaces a special-day override for the given date or date range.

Single closed day:
```json
{
  "date": "2026-12-25",
  "label": "Christmas",
  "isClosed": true
}
```
Date range — entire period uses the same rule (e.g. a week-long holiday):
```json
{
  "date": "2026-12-24",
  "endDate": "2026-12-26",
  "label": "Christmas Holiday",
  "isClosed": true
}
```
Range with modified hours (e.g. New Year's Eve):
```json
{
  "date": "2026-12-31",
  "endDate": "2026-12-31",
  "label": "New Year's Eve",
  "isClosed": false,
  "openTime": "10:00",
  "closeTime": "18:00"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | Yes | Start date. Also acts as the unique key for this entry. |
| `endDate` | `YYYY-MM-DD` | No | Inclusive end date. Must be ≥ `date`. Omit for a single day. |
| `label` | `string` | Yes | Human-readable name (e.g. `"Christmas"`) |
| `isClosed` | `boolean` | Yes | |
| `openTime` | `HH:mm` | When `isClosed: false` | |
| `closeTime` | `HH:mm` | When `isClosed: false` | |

**Note:** `openTime` and `closeTime` are **required** when `isClosed` is `false`. The same hours apply for every day within the range.  
**Note:** `isOpenNow` checks if today's date falls within `[date, endDate]`. If two entries would overlap, the first match wins (sorted by `date` ascending).  
**Returns:** Updated business-hours document.  
**Errors:** `400` if date format is wrong, `endDate < date`, or `openTime`/`closeTime` missing when open.

---

### DELETE `/api/business-hours/special-days/:date`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Params:** `date` — `YYYY-MM-DD` — the **start date** of the entry to remove (whether it was a single day or a range)  
**Body:** None  
**Returns:** Updated business-hours document (special day removed).  
**Errors:** `400` if date format is wrong; `404` if no entry with that start date exists.

---

## Reviews — `/api/reviews`

### POST `/api/reviews`
**Auth:** JWT  
**Roles:** `CUSTOMER`  
**Body:**
```json
{
  "orderId": "string (ObjectId)",
  "rating": "integer (1–5)",
  "comment": "string (max 1000, optional)"
}
```
**Returns:** `{ review }` — created review  
**Errors:** `400` if order is not COMPLETED; `403` if order does not belong to the customer; `404` if order not found; `409` if a review for this order already exists.  
**Note:** Reviews are immutable — once created they cannot be edited or deleted.

---

### GET `/api/reviews`
**Auth:** JWT  
**Roles:** `ADMIN`  
**Returns:** `{ reviews }` — all reviews, newest first.

---

### GET `/api/reviews/:id`
**Auth:** JWT  
**Roles:** `ADMIN`, `CUSTOMER` (own review only)  
**Returns:** `{ review }`  
**Errors:** `403` if CUSTOMER requests a review that belongs to another customer; `404` if not found.

---

## Cart — `/api/cart`

> One cart per user, created on first access. The cart is cleared automatically when an order is placed.

### GET `/api/cart`
**Auth:** JWT
**Roles:** Any authenticated
**Body:** None
**Returns:** The current user's cart (with populated `items.productId`). Creates an empty cart on first access.

---

### POST `/api/cart/items`
**Auth:** JWT
**Roles:** Any authenticated
**Body:**
```json
{
  "productId": "string (ObjectId)",
  "quantity": "integer (≥ 1) [optional, default 1]"
}
```
**Note:** If the product is already in the cart, its quantity is increased.
**Returns:** The updated cart.

---

### PATCH `/api/cart/items/:productId`
**Auth:** JWT
**Roles:** Any authenticated
**Params:** `productId` — MongoDB ObjectId
**Body:**
```json
{
  "quantity": "integer (≥ 1)"
}
```
**Returns:** The updated cart.
**Errors:** `404` if the cart or the item is not found.

---

### DELETE `/api/cart/items/:productId`
**Auth:** JWT
**Roles:** Any authenticated
**Params:** `productId` — MongoDB ObjectId
**Body:** None
**Returns:** The updated cart.
**Errors:** `404` if the cart or the item is not found.

---

## Orders — `/api/orders`

> Orders are created from the user's cart. Items store immutable **snapshots** of product name and price at purchase time.
> Lifecycle: `RECEIVED → APPROVED → IN_PREPARATION → READY → COMPLETED` (or `CANCELLED` while still `RECEIVED`).

### GET `/api/orders/kitchen`
**Auth:** JWT
**Roles:** `KITCHEN`, `ADMIN`
**Body:** None
**Returns:** Active kitchen queue (orders in `RECEIVED`, `APPROVED`, or `IN_PREPARATION`), oldest first (FIFO).

---

### GET `/api/orders/my`
**Auth:** JWT
**Roles:** Any authenticated
**Body:** None
**Returns:** The authenticated user's own orders, newest first.

---

### GET `/api/orders`
**Auth:** JWT
**Roles:** `KITCHEN`, `DELIVERY`, `ADMIN`
**Body:** None
**Returns:** All orders, newest first.

---

### POST `/api/orders`
**Auth:** JWT
**Roles:** `CUSTOMER`
**Body:**
```json
{
  "orderType": "DELIVERY | PICKUP [optional, default PICKUP]",
  "deliveryCity": "string (2–100) [required when orderType = DELIVERY]",
  "deliveryAddress": "string (2–500) [required when orderType = DELIVERY]"
}
```
**Behavior:** Builds the order from the current cart, snapshots item name/price, then clears the cart. For `DELIVERY`, the zone's `deliveryPrice` is added to the total and `estimatedDeliveryTime` is computed from the zone's `estimatedDeliveryMinutes`.
**Constraints:** The business must be open; for delivery, the city must have an active delivery zone.
**Errors:** `400` if the cart is empty, the business is closed, or delivery fields are missing; `404` if the delivery city is not supported.
**Returns:** `201` with the created order.

---

### PATCH `/api/orders/:id/status`
**Auth:** JWT
**Roles:** `KITCHEN`, `DELIVERY`, `ADMIN`
**Params:** `id` — MongoDB ObjectId
**Body:**
```json
{
  "status": "APPROVED | IN_PREPARATION | READY | COMPLETED | CANCELLED"
}
```
**Behavior:** Validates the transition against the lifecycle, emits the matching socket event to the customer, and persists a notification. `READY` highlights a dedicated notification; for delivery orders entering `IN_PREPARATION`, the ETA is recalculated and `order:estimatedTimeUpdated` is emitted.
**Errors:** `400` for an invalid transition; `404` if the order is not found.
**Returns:** The updated order.

---

### POST `/api/orders/:id/cancel`
**Auth:** JWT
**Roles:** `CUSTOMER`
**Params:** `id` — MongoDB ObjectId
**Body:**
```json
{
  "reason": "string (3–500)"
}
```
**Behavior:** Cancels the order, stores the reason, emits `ORDER_CANCELLED`, and notifies the customer.
**Errors:** `400` if the order is not in `RECEIVED` status; `403` if the order does not belong to the requester; `404` if not found.
**Returns:** The cancelled order.

---

## Notifications — `/api/notifications`

> In-app notifications are persisted and also pushed in real time via the `notification:new` socket event to the recipient's `user:<id>` room.

### GET `/api/notifications`
**Auth:** JWT
**Roles:** Any authenticated
**Body:** None
**Returns:** The authenticated user's notifications, newest first.

---

### PATCH `/api/notifications/:id/read`
**Auth:** JWT
**Roles:** Any authenticated (owner only)
**Params:** `id` — MongoDB ObjectId
**Body:** None
**Returns:** The updated notification (`isRead: true`).
**Errors:** `404` if the notification does not exist or does not belong to the requester.

---

## Statistics — `/api/stats`

### GET `/api/stats`
**Auth:** JWT
**Roles:** `ADMIN`
**Body:** None
**Returns:** Aggregated admin dashboard figures.

```json
{
  "success": true,
  "data": {
    "totalOrders": 128,
    "monthlyRevenue": 4210.5,
    "mostSoldProducts": [
      { "productId": "...", "name": "Margherita Pizza", "totalQuantity": 64 }
    ],
    "averageRating": 4.37,
    "totalCancellations": 7
  }
}
```
**Notes:** `monthlyRevenue` sums the `total` of `COMPLETED` orders in the current calendar month. `mostSoldProducts` returns the top 5 by quantity across all non-cancelled orders. `averageRating` is the mean of all review ratings.

---

## Socket.IO Events

Connect via Socket.IO with `auth: { token: "<JWT>" }`.

After connection the server places the socket in:
- `user:<userId>` — personal room
- `role:<activeRole lowercased>` — role broadcast room (e.g. `role:kitchen`)

| Event | Event name | Emitted when | Target | Data |
|-------|-----------|-------------|--------|------|
| `ORDER_CREATED` | `order:created` | A new order is placed | order owner | order |
| `ORDER_APPROVED` | `ORDER_APPROVED` | Order status → APPROVED | order owner | order |
| `ORDER_IN_PREPARATION` | `ORDER_IN_PREPARATION` | Order status → IN_PREPARATION | order owner | order |
| `ORDER_READY` | `ORDER_READY` | Order status → READY | order owner | order |
| `ORDER_COMPLETED` | `ORDER_COMPLETED` | Order status → COMPLETED | order owner | order |
| `ORDER_CANCELLED` | `ORDER_CANCELLED` | Order cancelled | order owner | order |
| `ORDER_ESTIMATED_TIME_UPDATED` | `order:estimatedTimeUpdated` | Delivery ETA recalculated (on IN_PREPARATION) | order owner | order |
| `NOTIFICATION_NEW` | `notification:new` | A notification is persisted | recipient | `{ message, type, orderId?, notification }` |
| `PRODUCT_AVAILABILITY_CHANGED` | `PRODUCT_AVAILABILITY_CHANGED` | Product availability toggled | broadcast | `{ productId, isAvailable }` |
| `INGREDIENT_AVAILABILITY_CHANGED` | `INGREDIENT_AVAILABILITY_CHANGED` | Ingredient status changed | broadcast | `{ ingredientId, status }` |
| `KITCHEN_ISSUE_REPORTED` | `KITCHEN_ISSUE_REPORTED` | Kitchen reports an issue | admins | `{ ... }` |

---

## Enums Quick Reference

```
UserRole:        CUSTOMER | KITCHEN | DELIVERY | ADMIN
OrderStatus:     RECEIVED | APPROVED | IN_PREPARATION | READY | COMPLETED | CANCELLED
OrderType:       DELIVERY | PICKUP
IngredientStatus: AVAILABLE | TEMPORARILY_UNAVAILABLE
PaymentStatus:   PENDING | PAID | FAILED
```

---

## Error Response Shape

All errors follow:
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": ["..."]
}
```

HTTP status codes used: `400` (validation), `401` (unauthenticated), `403` (forbidden), `404` (not found), `409` (conflict), `500` (server error).
