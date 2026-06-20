import { Schema, model, Document } from 'mongoose';

/**
 * DeliveryZone document. Owner: Developer A (Configuration).
 *
 * Admins define supported delivery cities. Each city belongs to exactly one
 * zone with a fixed delivery price and estimated delivery time.
 *
 * - isActive: temporarily disables deliveries to this city without removing it.
 * - isDeleted: soft delete — keeps the record for historical order references.
 *
 * Orders to unsupported (not found or inactive) cities are blocked;
 * the customer may switch to pickup instead.
 */
export interface IDeliveryZone extends Document {
  city: string;
  deliveryPrice: number;
  estimatedDeliveryMinutes: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    deliveryPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDeliveryMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

deliveryZoneSchema.index(
  { city: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false }, collation: { locale: 'en', strength: 2 } }
);

export const DeliveryZone = model<IDeliveryZone>('DeliveryZone', deliveryZoneSchema);
