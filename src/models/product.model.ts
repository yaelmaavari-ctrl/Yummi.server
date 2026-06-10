import { Schema, model, Document } from 'mongoose';

/**
 * Product document. Owner: Developer A (Catalog).
 *
 * Products belong to a single category and are built from ingredients.
 * Some products allow extras with a configurable number of free extras and
 * a price per additional extra. Products use soft delete only and must never
 * be physically removed if referenced by historical orders.
 *
 * TODO (Developer A): define fields, e.g.:
 *   - name, description, image, price
 *   - category: ObjectId ref 'Category'
 *   - ingredients: ObjectId[] ref 'Ingredient'
 *   - allowedExtras: ObjectId[] ref 'Ingredient' (empty = no extras)
 *   - freeExtrasCount: number
 *   - pricePerExtra: number
 *   - isAvailable: boolean (admin-controlled)
 *   - isDeleted: boolean (soft delete flag)
 */
export interface IProduct extends Document {
  // TODO: define fields
  isAvailable: boolean;
  isDeleted: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    // TODO: define schema fields
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = model<IProduct>('Product', productSchema);
