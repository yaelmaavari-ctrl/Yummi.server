import { Schema, model, Document } from 'mongoose';

/**
 * Notification document. Owner: Developer B (Notifications).
 *
 * In-app notifications. Examples:
 *   - Customer notified when their order becomes READY.
 *   - Administrators notified when a kitchen issue is reported.
 *
 * TODO (Developer B): define fields, e.g.:
 *   - recipient: ObjectId ref 'User'
 *   - type: string (e.g. ORDER_READY, KITCHEN_ISSUE_REPORTED)
 *   - message: string
 *   - data: Mixed (e.g. { orderId })
 *   - isRead: boolean
 */
export interface INotification extends Document {
  // TODO: define fields
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    // TODO: define schema fields
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', notificationSchema);
