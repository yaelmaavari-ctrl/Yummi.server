# Yummi Server

Backend API for the **Food Ordering Management System** - a generic food ordering platform (not tied to any specific restaurant type). Customers place orders, kitchen workers manage preparation, delivery workers complete deliveries, and administrators manage the business.

## Tech Stack

- **Node.js + Express** (HTTP API)
- **TypeScript** (CommonJS output)
- **MongoDB Atlas + Mongoose** (database)
- **JWT** (`jsonwebtoken` + `bcryptjs`) for authentication
- **Joi** for request validation
- **Socket.IO** for real-time events
- **ESLint + Prettier** for code quality
- `ts-node-dev` for auto-reloading during development

## Project Structure

```
src/
  config/        env, db (Mongoose), socket (Socket.IO init)
  models/        Mongoose schemas (User, Category, Product, Ingredient, Order,
                 Cart, DeliveryZone, BusinessHours, Review, Notification)
  controllers/   HTTP handlers (thin; delegate to services)
  services/      Business logic
  routes/        Express routers (index.ts mounts all under /api)
  validations/   Joi schemas
  middlewares/   auth (JWT), role (activeRole), validate (Joi), error
  sockets/       events.ts (event-name constants, room helpers, emit helper)
  utils/         ApiError, asyncHandler, jwt
  types/         shared enums and types
  app.ts         Express app (middleware, routes, error handling)
  server.ts      HTTP server + Socket.IO + graceful shutdown
```

## Getting Started

### 1. Prerequisites

- Node.js 20+ (developed on v22)
- A MongoDB Atlas cluster and its connection string

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in real values:

```bash
cp .env.example .env
```

| Variable         | Description                                  |
| ---------------- | -------------------------------------------- |
| `NODE_ENV`       | `development` or `production`                |
| `PORT`           | HTTP port (default `5000`)                   |
| `MONGO_URI`      | MongoDB Atlas connection string (required)   |
| `JWT_SECRET`     | Secret used to sign JWTs (required)          |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`)                   |
| `CLIENT_URL`     | Angular client origin for CORS and Socket.IO |

### 4. Run

```bash
npm run dev      # start with auto-reload (ts-node-dev)
npm run build    # compile TypeScript to dist/
npm start        # run the compiled build
npm run lint     # lint
npm run format   # format with Prettier
```

Verify the server is up:

```bash
curl http://localhost:5000/api/health
# { "success": true, "status": "ok", "timestamp": "..." }
```

## API Surface

All routes are mounted under `/api`. Endpoints currently return `501 Not Implemented` until each owner fills them in.

| Base path              | Resource        | Owner       |
| ---------------------- | --------------- | ----------- |
| `/api/auth`            | Authentication  | Developer A |
| `/api/categories`      | Categories      | Developer A |
| `/api/products`        | Products        | Developer A |
| `/api/ingredients`     | Ingredients     | Developer A |
| `/api/delivery-zones`  | Delivery zones  | Developer A |
| `/api/business-hours`  | Business hours  | Developer A |
| `/api/reviews`         | Reviews         | Developer A |
| `/api/cart`            | Cart            | Developer B |
| `/api/orders`          | Orders          | Developer B |
| `/api/notifications`   | Notifications   | Developer B |
| `/api/stats`           | Statistics      | Developer B |

## Authentication & Roles

A single user may own multiple roles: `CUSTOMER`, `KITCHEN`, `DELIVERY`, `ADMIN`. Only **one role is active per session**, encoded in the JWT as `activeRole`. All authorization is based on `activeRole`.

- `authenticate` middleware verifies the `Bearer` token and sets `req.user`.
- `authorize(...roles)` middleware restricts a route to specific active roles.

## Real-Time Events (Socket.IO)

Event name constants live in `src/sockets/events.ts`:

`ORDER_APPROVED`, `ORDER_IN_PREPARATION`, `ORDER_READY`, `ORDER_COMPLETED`, `ORDER_CANCELLED`, `PRODUCT_AVAILABILITY_CHANGED`, `INGREDIENT_AVAILABILITY_CHANGED`, `KITCHEN_ISSUE_REPORTED`.

Use `emitEvent(event, payload, rooms?)` to broadcast, and the `Rooms` helpers to target a specific user or role.

## Division of Labor

See [DIVISION_OF_LABOR.md](DIVISION_OF_LABOR.md) for the 2-developer task split.
