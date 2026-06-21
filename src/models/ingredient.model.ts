import { Schema, model, Document } from 'mongoose';
import { IngredientStatus } from '../types';

/**
 * Ingredient document. Owner: Developer A (Catalog).
 *
 * Ingredients are managed separately from products. Kitchen workers mark
 * ingredients as TEMPORARILY_UNAVAILABLE when they run out. An ingredient
 * shortage does NOT automatically disable products; admins control product
 * availability manually.
 */
export interface IIngredient extends Document {
  name: string;
  status: IngredientStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: Object.values(IngredientStatus),
      default: IngredientStatus.AVAILABLE,
    },
  },
  { timestamps: true }
);

ingredientSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Ingredient = model<IIngredient>('Ingredient', ingredientSchema);
