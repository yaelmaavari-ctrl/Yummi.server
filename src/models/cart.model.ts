import { Schema, model, Document, Types } from 'mongoose';

/**
 * Cart document. Owner: Developer B (Ordering).
 *
 * Holds the customer's in-progress selection before an order is placed.
 * Each user has exactly one cart (1:1 relationship enforced by a unique
 * index on `userId`).
 *
 * Line items with the same product but different add-ons are stored as
 * separate entries. Matching merges quantity only when productId and
 * selectedExtras are identical.
 */
export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  selectedExtras: Types.ObjectId[];
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    selectedExtras: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Ingredient' }],
      default: [],
    },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Cart = model<ICart>('Cart', cartSchema);
