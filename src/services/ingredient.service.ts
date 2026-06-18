import { IIngredient, Ingredient } from '../models/ingredient.model';
import { Product } from '../models/product.model';
import { IngredientStatus } from '../types';
import { ApiError } from '../utils/ApiError';

export interface PublicIngredient {
  id: string;
  name: string;
  status: IngredientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIngredientInput {
  name: string;
  status?: IngredientStatus;
}

function toPublicIngredient(ingredient: IIngredient): PublicIngredient {
  return {
    id: ingredient._id.toString(),
    name: ingredient.name,
    status: ingredient.status,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findByName(name: string, excludeId?: string): Promise<IIngredient | null> {
  const filter: Record<string, unknown> = {
    name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
  };

  if (excludeId) {
    filter['_id'] = { $ne: excludeId };
  }

  return Ingredient.findOne(filter);
}

async function getExistingById(id: string): Promise<IIngredient> {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw ApiError.notFound('Ingredient not found');
  }
  return ingredient;
}

async function list(): Promise<PublicIngredient[]> {
  const ingredients = await Ingredient.find().sort({ name: 1 });
  return ingredients.map(toPublicIngredient);
}

async function getById(id: string): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);
  return toPublicIngredient(ingredient);
}

async function create(input: CreateIngredientInput): Promise<PublicIngredient> {
  const name = input.name.trim();

  const existing = await findByName(name);
  if (existing) {
    throw ApiError.conflict('Ingredient name already exists');
  }

  const ingredient = await Ingredient.create({
    name,
    status: input.status ?? IngredientStatus.AVAILABLE,
  });

  return toPublicIngredient(ingredient);
}

async function update(id: string, name: string): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);

  const trimmed = name.trim();
  const existing = await findByName(trimmed, id);
  if (existing) {
    throw ApiError.conflict('Ingredient name already exists');
  }

  ingredient.name = trimmed;
  await ingredient.save();
  return toPublicIngredient(ingredient);
}

async function setStatus(id: string, status: IngredientStatus): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);
  ingredient.status = status;
  await ingredient.save();
  return toPublicIngredient(ingredient);
}

async function remove(id: string): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);

  const referencedCount = await Product.countDocuments({
    $or: [{ ingredients: id }, { allowedExtras: id }],
    isDeleted: false,
  });

  if (referencedCount > 0) {
    throw ApiError.conflict('Cannot delete ingredient while active products reference it');
  }

  await ingredient.deleteOne();
  return toPublicIngredient(ingredient);
}

export const ingredientService = {
  list,
  getById,
  create,
  update,
  setStatus,
  remove,
};
