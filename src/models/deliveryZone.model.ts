import { Schema, model, Document } from 'mongoose';

/**
 * DeliveryZone document. Owner: Developer A (Configuration).
 *
 * Admins define supported delivery cities. Orders to unsupported cities are
 * blocked (the customer may switch to pickup).
 *
 * TODO (Developer A): define fields, e.g.:
 *   - city: string (unique)
 *   - deliveryPrice: number
 *   - estimatedDeliveryMinutes: number
 *   - isActive: boolean
 */
export interface IDeliveryZone extends Document {
  // TODO: define fields
  isActive: boolean;
}

const deliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    // TODO: define schema fields
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DeliveryZone = model<IDeliveryZone>('DeliveryZone', deliveryZoneSchema);
