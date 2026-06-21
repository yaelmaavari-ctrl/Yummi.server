import { Schema, model, Document, Types } from 'mongoose';

/**
 * Notification document. Owner: Developer B (Notifications).
 *
 * In-app notifications persisted for customers and staff.
 */
export interface INotification extends Document {
  recipient: Types.ObjectId;
  type: string;
  message: string;
  data: { orderId?: string };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', notificationSchema);
