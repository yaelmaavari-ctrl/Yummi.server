import { Schema, model, Document } from 'mongoose';
import { OrderStatus, OrderType, PaymentStatus } from '../types';

/**
 * Order document. Owner: Developer B (Ordering & Operations).
 *
 * Orders store SNAPSHOTS of product name/price and selected extras + prices so
 * that historical orders remain unchanged even if products are later modified.
 *
 * Lifecycle: RECEIVED -> APPROVED -> IN_PREPARATION -> READY -> COMPLETED
 *            (CANCELLED only allowed while status is RECEIVED).
 *
 * TODO (Developer B): define fields, e.g.:
 *   - customer: ObjectId ref 'User'
 *   - items: [{ productId, productName, productPrice, extras: [{ name, price }], quantity }]
 *   - orderType: OrderType (DELIVERY | PICKUP)
 *   - deliveryAddress: { city, street, houseNumber } (when DELIVERY)
 *   - deliveryZone: ObjectId ref 'DeliveryZone'
 *   - subtotal, deliveryFee, total: number
 *   - paymentStatus: PaymentStatus
 *   - status: OrderStatus
 *   - assignedKitchenWorkerId: ObjectId ref 'User'
 *   - cancellationReason: string (required when CANCELLED)
 */
export interface IOrder extends Document {
  // TODO: define fields
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
}

const orderSchema = new Schema<IOrder>(
  {
    // TODO: define schema fields
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.RECEIVED,
    },
    orderType: { type: String, enum: Object.values(OrderType), required: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);
