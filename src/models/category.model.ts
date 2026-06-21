import { Schema, model, Document } from 'mongoose';

/**
 * Category document. Owner: Developer A (Catalog).
 *
 * Categories use soft delete only. Deletion is blocked while active
 * (non-deleted) products still reference the category.
 */
export interface ICategory extends Document {
  name: string;
  description?: string;
  image?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    image: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Category = model<ICategory>('Category', categorySchema);
