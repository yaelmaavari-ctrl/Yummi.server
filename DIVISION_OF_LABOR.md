# Division of Labor - 2 Developers

This document splits the backend work between two developers. The shared **infrastructure** (server, DB connection, config, auth/role/validate/error middlewares, Socket.IO setup, utils, enums, and all empty stub files) is already in place. Each developer fills in the stubs for their domain.

## Shared Foundation (already provided)

- `src/config/*` - env loading, MongoDB connection, Socket.IO init
- `src/middlewares/*` - `authenticate`, `authorize`, `validate`, error handling
- `src/utils/*` - `ApiError`, `asyncHandler`, `jwt` (sign/verify with `userId` + `activeRole`)
- `src/sockets/events.ts` - event-name constants, room helpers, `emitEvent`
- `src/types/index.ts` - enums (`UserRole`, `OrderStatus`, `OrderType`, `IngredientStatus`, `PaymentStatus`)
- `src/app.ts`, `src/server.ts` - wired and runnable

> Auth/Users sits in Developer A's column, but since everything depends on it, **build it first** and coordinate the User model + auth flow early.

---

## Developer A - Catalog & Configuration

Owns the menu, the static configuration of the business, and customer reviews.

| Domain          | Files (model / controller / service / route / validation)                                              | Key responsibilities                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Auth & Users    | `user.model` / `auth.controller` / `auth.service` / `auth.routes` / `auth.validation`                  | Register, login, password hashing (bcryptjs), JWT issue, **switch active role**, `getMe`. Owns the `User` model.  |
| Categories      | `category.*`                                                                                           | CRUD, soft delete, block deletion while active products exist.                                                    |
| Products        | `product.*`                                                                                            | CRUD, ingredients, extras config (free count + price per extra), availability toggle, soft delete only.           |
| Ingredients     | `ingredient.*`                                                                                         | CRUD, manual stock updates, `AVAILABLE` / `TEMPORARILY_UNAVAILABLE` status. Shortages do NOT auto-disable products. |
| Delivery Zones  | `deliveryZone.*`                                                                                       | CRUD, per-city delivery price + ETA, city-availability check.                                                     |
| Business Hours  | `businessHours.*`                                                                                      | Weekly schedule + special days, `isOpenNow` check (used to block orders when closed).                             |
| Reviews         | `review.*`                                                                                             | One immutable review per COMPLETED order (rating 1-5 + comment).                                                  |

**Socket events emitted by Developer A:** `PRODUCT_AVAILABILITY_CHANGED`, `INGREDIENT_AVAILABILITY_CHANGED`.

---

## Developer B - Ordering & Operations + Real-Time

Owns the dynamic order pipeline, kitchen/delivery workflows, notifications, statistics, and real-time wiring.

| Domain          | Files (model / controller / service / route / validation)             | Key responsibilities                                                                                                                                  |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart            | `cart.*`                                                              | Get/add/update/remove/clear items; validate selected extras against the product's `allowedExtras` and free-extras config.                             |
| Orders          | `order.*`                                                             | Place order with **price/extras snapshots**; lifecycle RECEIVED -> APPROVED -> IN_PREPARATION -> READY -> COMPLETED; cancel (RECEIVED only, reason required). |
| Kitchen flow    | (within `order.*`)                                                   | See incoming orders, take ownership (`assignedKitchenWorkerId`), approve/prepare/ready, complete pickup orders, report kitchen issues.                |
| Delivery flow   | (within `order.*`)                                                   | View READY delivery orders (no assignment), complete deliveries.                                                                                      |
| Notifications   | `notification.*`                                                     | In-app notifications: order READY -> customer; kitchen issue -> all admins (persist + socket emit).                                                   |
| Statistics      | `stats.*`                                                            | Admin dashboard: total orders, monthly revenue, most-sold products, average ratings, total cancellations.                                            |

**Socket events emitted by Developer B:** `ORDER_APPROVED`, `ORDER_IN_PREPARATION`, `ORDER_READY`, `ORDER_COMPLETED`, `ORDER_CANCELLED`, `KITCHEN_ISSUE_REPORTED`.

---

## Cross-Cutting Conventions

- **Controllers stay thin**: parse/validate input, call the service, shape the response. Put logic in services.
- **Always** wrap async controller handlers with `asyncHandler` and throw `ApiError` for failures.
- **Validate** request input with Joi schemas via the `validate` middleware.
- **Authorize** every protected route with `authenticate` + `authorize(...roles)` based on `activeRole`.
- **Soft delete only** for products and categories; never physically delete records referenced by historical orders.
- **Snapshots**: orders must copy product name/price and extra names/prices at purchase time so history is immutable.
- Keep socket event names in sync via the constants in `src/sockets/events.ts`.

## Suggested Order of Work

1. (A) User model + auth + role-switching - unblocks everything.
2. (A) Categories, Products, Ingredients - the catalog customers browse.
3. (A) Delivery zones + Business hours - needed by order placement.
4. (B) Cart, then Orders (placement with snapshots).
5. (B) Kitchen + delivery workflows + socket events.
6. (B) Notifications, then Statistics.
7. (A) Reviews (after orders can reach COMPLETED).
