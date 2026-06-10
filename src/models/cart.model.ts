import { Schema, model, Document } from 'mongoose';

/**
 * Cart document. Owner: Developer B (Ordering).
 *
 * Holds the customer's in-progress selection before an order is placed.
 *
 * TODO (Developer B): define fields, e.g.:
 *   - customer: ObjectId ref 'User' (unique - one active cart per customer)
 *   - items: [{ product: ObjectId ref 'Product', quantity, selectedExtras: ObjectId[] ref 'Ingredient' }]
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICart extends Document {
  // TODO: define fields
}

const cartSchema = new Schema<ICart>(
  {
    // TODO: define schema fields
  },
  { timestamps: true }
);

export const Cart = model<ICart>('Cart', cartSchema);
