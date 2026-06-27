import { emitEvent, Rooms, SocketEvents } from './events';

/**
 * Emits 'order:created' to the order owner's user room AND to all
 * connected kitchen workers so the kitchen queue updates in real time.
 */
export function emitOrderCreated(userId: string, order: unknown): void {
  emitEvent(SocketEvents.ORDER_CREATED, order, [Rooms.user(userId), Rooms.kitchen()]);
}

/**
 * Emits 'notification:new' to the recipient's user room only.
 * Used by notificationService after persisting a notification.
 */
export function emitNotificationEvent(
  userId: string,
  payload: { message: string; type: string; orderId?: string; notification?: unknown }
): void {
  emitEvent(SocketEvents.NOTIFICATION_NEW, payload, Rooms.user(userId));
}
