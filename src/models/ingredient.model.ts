import { Schema, model, Document } from 'mongoose';
import { IngredientStatus } from '../types';

/**
 * Ingredient document. Owner: Developer A (Catalog).
 *
 * Ingredients are managed separately from products. Kitchen workers update
 * stock manually. An ingredient shortage does NOT automatically disable
 * products; admins control product availability manually.
 *
 * TODO (Developer A): define fields, e.g.:
 *   - name: string
 *   - stock: number
 *   - status: IngredientStatus
 */
export interface IIngredient extends Document {
  // TODO: define fields
  status: IngredientStatus;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    // TODO: define schema fields
    status: {
      type: String,
      enum: Object.values(IngredientStatus),
      default: IngredientStatus.AVAILABLE,
    },
  },
  { timestamps: true }
);

export const Ingredient = model<IIngredient>('Ingredient', ingredientSchema);
