import { Schema, model, Document, Types } from 'mongoose';

/**
 * Product document. Owner: Developer A (Catalog).
 *
 * Products may belong to multiple categories and are built from ingredients.
 * Some products allow extras with a configurable number of free extras and
 * a price per additional extra. Products use soft delete only and must never
 * be physically removed if referenced by historical orders.
 */
export interface IProduct extends Document {
  name: string;
  description?: string;
  image?: string;
  price: number;
  categories: Types.ObjectId[];
  ingredients: Types.ObjectId[];
  allowedExtras: Types.ObjectId[];
  freeExtrasCount: number;
  pricePerExtra: number;
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    image: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    ],
    ingredients: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ingredient',
      },
    ],
    allowedExtras: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ingredient',
      },
    ],
    freeExtrasCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerExtra: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ categories: 1, isDeleted: 1, isAvailable: 1 });

export const Product = model<IProduct>('Product', productSchema);
