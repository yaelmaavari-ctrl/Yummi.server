/**
 * Order service - business logic. Owner: Developer B.
 *
 * TODO: implement the full order lifecycle:
 *   - placeOrder: validate business hours + delivery zone, compute totals,
 *     store SNAPSHOTS of product name/price and extras/prices, create as RECEIVED.
 *   - status transitions with guards (RECEIVED -> APPROVED -> IN_PREPARATION -> READY -> COMPLETED).
 *   - cancel: only while RECEIVED, with a mandatory reason.
 *   - kitchen ownership + delivery completion.
 * Emit ORDER_* socket events. Reads/writes the Order model.
 */
export const orderService = {};
