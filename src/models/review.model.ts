import { Schema, model, Document } from 'mongoose';

/**
 * Review document. Owner: Developer A (Reviews).
 *
 * Submitted by a customer after an order is COMPLETED. Exactly one review per
 * order, and reviews cannot be edited once created.
 *
 * TODO (Developer A): define fields, e.g.:
 *   - order: ObjectId ref 'Order' (unique)
 *   - customer: ObjectId ref 'User'
 *   - rating: number (1-5)
 *   - comment: string
 */
export interface IReview extends Document {
  // TODO: define fields
  rating: number;
}

const reviewSchema = new Schema<IReview>(
  {
    // TODO: define schema fields
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

export const Review = model<IReview>('Review', reviewSchema);
