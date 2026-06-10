import { Schema, model, Document } from 'mongoose';

/**
 * Category document. Owner: Developer A (Catalog).
 *
 * Categories use soft delete only. Deletion is blocked while active
 * (non-deleted) products still reference the category.
 *
 * TODO (Developer A): define fields, e.g.:
 *   - name: string
 *   - description: string
 *   - image: string
 *   - isDeleted: boolean (soft delete flag)
 */
export interface ICategory extends Document {
  // TODO: define fields
  isDeleted: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    // TODO: define schema fields
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category = model<ICategory>('Category', categorySchema);
