import { Schema, model, Document, Types } from 'mongoose';
import { OrderStatus, OrderType, PaymentStatus } from '../types';

/**
 * Order document. Owner: Developer B (Ordering & Operations).
 *
 * Items are SNAPSHOTS of product name/price at purchase time so that
 * historical orders remain correct even if products are later modified.
 *
 * Lifecycle: PENDING -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED
 *            (CANCELLED allowed at any point before DELIVERED).
 */
export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  estimatedDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    orderType: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.PICKUP,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    deliveryType: {
      type: String,
      enum: ['PICKUP', 'DELIVERY'],
      default: 'PICKUP',
    },
    deliveryAddress: {
      type: String,
    },
    estimatedDeliveryTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);
