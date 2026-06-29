import { Types } from 'mongoose';
import { IIngredient, Ingredient } from '../models/ingredient.model';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { IngredientStatus, UserRole } from '../types';
import { ApiError } from '../utils/ApiError';
import { emitEvent, SocketEvents } from '../sockets/events';
import { notificationService } from './notification.service';

export interface PublicIngredient {
  id: string;
  name: string;
  status: IngredientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngredientUsageSummary {
  baseProductCount: number;
  extraProductCount: number;
}

export interface PublicIngredientWithUsage extends PublicIngredient {
  usage: IngredientUsageSummary;
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

async function getUsageCounts(id: string): Promise<IngredientUsageSummary> {
  const objectId = new Types.ObjectId(id);

  const [baseProductCount, extraProductCount] = await Promise.all([
    Product.countDocuments({ ingredients: objectId, isDeleted: false }),
    Product.countDocuments({ allowedExtras: objectId, isDeleted: false }),
  ]);

  return { baseProductCount, extraProductCount };
}

async function syncProductsForIngredient(
  ingredientId: string,
  status: IngredientStatus
): Promise<void> {
  const objectId = new Types.ObjectId(ingredientId);

  if (status === IngredientStatus.TEMPORARILY_UNAVAILABLE) {
    const products = await Product.find({
      ingredients: objectId,
      isDeleted: false,
      isAvailable: true,
    });

    for (const product of products) {
      product.isAvailable = false;
      await product.save();

      emitEvent(SocketEvents.PRODUCT_AVAILABILITY_CHANGED, {
        productId: product._id.toString(),
        isAvailable: false,
        categoryIds: product.categories.map((categoryId) => categoryId.toString()),
        reason: 'base_ingredient_unavailable',
        ingredientId,
      });
    }

    return;
  }

  const products = await Product.find({
    ingredients: objectId,
    isDeleted: false,
    isAvailable: false,
  });

  for (const product of products) {
    const baseIngredientIds = product.ingredients.map((id) => id.toString());
    const unavailableCount = await Ingredient.countDocuments({
      _id: { $in: baseIngredientIds },
      status: IngredientStatus.TEMPORARILY_UNAVAILABLE,
    });

    if (unavailableCount === 0) {
      product.isAvailable = true;
      await product.save();

      emitEvent(SocketEvents.PRODUCT_AVAILABILITY_CHANGED, {
        productId: product._id.toString(),
        isAvailable: true,
        categoryIds: product.categories.map((categoryId) => categoryId.toString()),
        reason: 'base_ingredients_restored',
        ingredientId,
      });
    }
  }
}

async function list(includeUsage = false): Promise<PublicIngredient[] | PublicIngredientWithUsage[]> {
  const ingredients = await Ingredient.find().sort({ name: 1 });

  if (!includeUsage) {
    return ingredients.map(toPublicIngredient);
  }

  const withUsage = await Promise.all(
    ingredients.map(async (ingredient) => ({
      ...toPublicIngredient(ingredient),
      usage: await getUsageCounts(ingredient._id.toString()),
    }))
  );

  return withUsage;
}

async function getById(id: string, includeUsage = false): Promise<PublicIngredient | PublicIngredientWithUsage> {
  const ingredient = await getExistingById(id);
  const publicIngredient = toPublicIngredient(ingredient);

  if (!includeUsage) {
    return publicIngredient;
  }

  return {
    ...publicIngredient,
    usage: await getUsageCounts(id),
  };
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

  await syncProductsForIngredient(id, status);

  return toPublicIngredient(ingredient);
}

async function reportShortage(
  id: string,
  reporterId: string,
  message?: string
): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);
  const admins = await User.find({ roles: UserRole.ADMIN, isActive: true });

  const notificationMessage =
    message?.trim() ||
    `Kitchen reported that "${ingredient.name}" is missing or running low. Please restock or reorder.`;

  await Promise.all(
    admins.map((admin) =>
      notificationService.create({
        recipientId: admin._id.toString(),
        type: 'KITCHEN_ISSUE_REPORTED',
        message: notificationMessage,
      })
    )
  );

  emitEvent(SocketEvents.KITCHEN_ISSUE_REPORTED, {
    ingredientId: ingredient._id.toString(),
    name: ingredient.name,
    message: notificationMessage,
    reportedBy: reporterId,
  });

  return toPublicIngredient(ingredient);
}

async function remove(id: string): Promise<PublicIngredient> {
  const ingredient = await getExistingById(id);

  const referencedCount = await Product.countDocuments({
    $or: [{ ingredients: ingredient._id }, { allowedExtras: ingredient._id }],
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
  reportShortage,
  remove,
};
