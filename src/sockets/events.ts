import { Server } from 'socket.io';
import { getIO } from '../config/socket';

/**
 * Canonical real-time event names emitted by the server.
 * Keep these in sync with the Angular client.
 */
export const SocketEvents = {
  ORDER_APPROVED: 'ORDER_APPROVED',
  ORDER_IN_PREPARATION: 'ORDER_IN_PREPARATION',
  ORDER_READY: 'ORDER_READY',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_UPDATED: 'order:statusUpdated',
  ORDER_ESTIMATED_TIME_UPDATED: 'order:estimatedTimeUpdated',
  NOTIFICATION_NEW: 'notification:new',
  PRODUCT_AVAILABILITY_CHANGED: 'PRODUCT_AVAILABILITY_CHANGED',
  INGREDIENT_AVAILABILITY_CHANGED: 'INGREDIENT_AVAILABILITY_CHANGED',
  KITCHEN_ISSUE_REPORTED: 'KITCHEN_ISSUE_REPORTED',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

/**
 * Room naming helpers so events can be targeted to the right audience.
 */
export const Rooms = {
  /** A specific user (used for customer-targeted notifications). */
  user: (userId: string): string => `user:${userId}`,
  /** All connected kitchen workers. */
  kitchen: (): string => 'role:kitchen',
  /** All connected delivery workers. */
  delivery: (): string => 'role:delivery',
  /** All connected administrators. */
  admin: (): string => 'role:admin',
};

/**
 * Emits an event to one or more rooms. Falls back to a global broadcast
 * when no room is provided.
 */
export function emitEvent(event: SocketEvent, payload: unknown, rooms?: string | string[]): void {
  const io: Server = getIO();
  if (!rooms) {
    io.emit(event, payload);
    return;
  }
  io.to(rooms).emit(event, payload);
}
