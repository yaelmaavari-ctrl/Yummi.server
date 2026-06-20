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

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/business-hours` — Get current schedule (all roles)
- `PATCH /api/business-hours/weekly` — Update weekly schedule (ADMIN)
  - Body: `{ weeklySchedule: [{ dayOfWeek, openTime, closeTime, isClosed }] }`
- `POST /api/business-hours/special-days` — Add special day (ADMIN)
  - Body: `{ date, label, isClosed, openTime?, closeTime? }`
- `DELETE /api/business-hours/special-days/:date` — Remove special day (ADMIN)

---

## Reviews — `/api/reviews`

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/reviews` — List all reviews (ADMIN)
- `GET /api/reviews/:id` — Get review by id (ADMIN, CUSTOMER — own only)
- `POST /api/reviews` — Create review (CUSTOMER)
  - Body: `{ orderId, rating (1–5), comment? }`
  - Constraints: order must be COMPLETED, one review per order, immutable

---

## Cart — `/api/cart`

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/cart` — Get current user's cart (CUSTOMER)
- `POST /api/cart/items` — Add item to cart (CUSTOMER)
  - Body: `{ productId, quantity, selectedExtras?: [ingredientId] }`
- `PATCH /api/cart/items/:productId` — Update item quantity (CUSTOMER)
  - Body: `{ quantity }`
- `DELETE /api/cart/items/:productId` — Remove item (CUSTOMER)
- `DELETE /api/cart` — Clear cart (CUSTOMER)

---

## Orders — `/api/orders`

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/orders` — List orders (ADMIN: all; CUSTOMER: own; KITCHEN: assigned)
- `GET /api/orders/:id` — Get order detail (ADMIN, CUSTOMER — own, KITCHEN — assigned)
- `POST /api/orders` — Place order (CUSTOMER)
  - Body:
    ```json
    {
      "orderType": "DELIVERY | PICKUP",
      "deliveryAddress": { "city", "street", "houseNumber" },
      "items": [{ "productId", "quantity", "selectedExtras": ["ingredientId"] }]
    }
    ```
  - Constraints: business must be open, delivery city must be in a delivery zone
- `PATCH /api/orders/:id/status` — Advance order status (KITCHEN / ADMIN)
  - Body: `{ "status": "APPROVED | IN_PREPARATION | READY | COMPLETED" }`
- `POST /api/orders/:id/cancel` — Cancel order (CUSTOMER — only while RECEIVED)
  - Body: `{ "reason": "string" }`

---

## Notifications — `/api/notifications`

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/notifications` — Get own notifications (any authenticated)
- `PATCH /api/notifications/:id/read` — Mark as read (owner)
- `PATCH /api/notifications/read-all` — Mark all as read (any authenticated)

---

## Statistics — `/api/stats`

> 🚧 Not implemented yet (returns 501).

**Planned endpoints:**
- `GET /api/stats` — Aggregated stats (ADMIN)
  - Returns: total orders, monthly revenue, most sold products, average rating, total cancellations
- `GET /api/stats/revenue` — Revenue over time (ADMIN)
  - Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD`

---

## Socket.IO Events

Connect via Socket.IO with `auth: { token: "<JWT>" }`.

After connection the server places the socket in:
- `user:<userId>` — personal room
- `role:<activeRole>` — role broadcast room (e.g. `role:KITCHEN`)

| Event | Emitted when | Data |
|-------|-------------|------|
| `ORDER_APPROVED` | Order status → APPROVED | `{ orderId }` |
| `ORDER_IN_PREPARATION` | Order status → IN_PREPARATION | `{ orderId }` |
| `ORDER_READY` | Order status → READY | `{ orderId }` |
| `ORDER_COMPLETED` | Order status → COMPLETED | `{ orderId }` |
| `ORDER_CANCELLED` | Order cancelled | `{ orderId }` |
| `PRODUCT_AVAILABILITY_CHANGED` | Product toggled | `{ productId, isAvailable }` |
| `INGREDIENT_AVAILABILITY_CHANGED` | Ingredient status changed | `{ ingredientId, status }` |
| `KITCHEN_ISSUE_REPORTED` | Kitchen reports an issue | `{ ... }` |

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
