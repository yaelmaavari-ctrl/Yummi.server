import { emitEvent, Rooms, SocketEvents } from './events';

/**
 * Emits 'order:created' to the owner's user room only.
 */
export function emitOrderCreated(userId: string, order: unknown): void {
  emitEvent(SocketEvents.ORDER_CREATED, order, Rooms.user(userId));
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
