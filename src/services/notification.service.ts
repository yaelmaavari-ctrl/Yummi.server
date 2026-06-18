import { Notification, INotification } from '../models/notification.model';
import { ApiError } from '../utils/ApiError';
import { emitNotificationEvent } from '../sockets/orderNotifications';

export interface CreateNotificationInput {
  recipientId: string;
  type: string;
  message: string;
  orderId?: string;
}

/**
 * Notification service - business logic. Owner: Developer B.
 * Persists notifications and emits real-time events to the recipient's room.
 */
export const notificationService = {
  /**
   * Creates a notification, persists it, and emits 'notification:new' to the recipient.
   */
  async create(input: CreateNotificationInput): Promise<INotification> {
    const notification = await Notification.create({
      recipient: input.recipientId,
      type: input.type,
      message: input.message,
      data: input.orderId ? { orderId: input.orderId } : {},
      isRead: false,
    });

    emitNotificationEvent(input.recipientId, {
      message: input.message,
      type: input.type,
      orderId: input.orderId,
      notification,
    });

    return notification;
  },

  /**
   * Returns all notifications for the authenticated user, newest first.
   */
  async listMine(userId: string): Promise<INotification[]> {
    return Notification.find({ recipient: userId }).sort({ createdAt: -1 });
  },

  /**
   * Marks a single notification as read for the owning user.
   */
  async markAsRead(userId: string, notificationId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    return notification;
  },
};
