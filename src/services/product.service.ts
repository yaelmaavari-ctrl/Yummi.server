import { Types } from 'mongoose';
import { Category } from '../models/category.model';
import { Ingredient } from '../models/ingredient.model';
import { IProduct, Product } from '../models/product.model';
import { ApiError } from '../utils/ApiError';

export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  categories: string[];
  ingredients: string[];
  allowedExtras: string[];
  freeExtrasCount: number;
  pricePerExtra: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  image?: string;
  price: number;
  categories: string[];
  ingredients?: string[];
  allowedExtras?: string[];
  freeExtrasCount?: number;
  pricePerExtra?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  categories?: string[];
  ingredients?: string[];
  allowedExtras?: string[];
  freeExtrasCount?: number;
  pricePerExtra?: number;
}

export interface ListByCategoryOptions {
  includeUnavailable?: boolean;
}

function toPublicProduct(product: IProduct): PublicProduct {
  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    image: product.image,
    price: product.price,
    categories: product.categories.map((id) => id.toString()),
    ingredients: product.ingredients.map((id) => id.toString()),
    allowedExtras: product.allowedExtras.map((id) => id.toString()),
    freeExtrasCount: product.freeExtrasCount,
    pricePerExtra: product.pricePerExtra,
    isAvailable: product.isAvailable,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function validateCategoryIds(categoryIds: string[]): Promise<Types.ObjectId[]> {
  const unique = [...new Set(categoryIds.map((id) => id.trim()))];
  const count = await Category.countDocuments({
    _id: { $in: unique },
    isDeleted: false,
  });

  if (count !== unique.length) {
    throw ApiError.badRequest('One or more categories not found');
  }

  return unique.map((id) => new Types.ObjectId(id));
}

async function validateIngredientIds(ids: string[]): Promise<Types.ObjectId[]> {
  const unique = [...new Set(ids.map((id) => id.trim()))];

  if (unique.length === 0) {
    return [];
  }

  const count = await Ingredient.countDocuments({ _id: { $in: unique } });

  if (count !== unique.length) {
    throw ApiError.badRequest('One or more ingredients not found');
  }

  return unique.map((id) => new Types.ObjectId(id));
}

function normalizeExtrasConfig(
  allowedExtras: Types.ObjectId[],
  freeExtrasCount: number,
  pricePerExtra: number
): { freeExtrasCount: number; pricePerExtra: number } {
  if (allowedExtras.length === 0) {
    return { freeExtrasCount: 0, pricePerExtra: 0 };
  }

  if (freeExtrasCount > allowedExtras.length) {
    throw ApiError.badRequest('freeExtrasCount cannot exceed the number of allowed extras');
  }

  return { freeExtrasCount, pricePerExtra };
}

async function getActiveById(id: string): Promise<IProduct> {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

async function listByCategory(
  categoryId: string,
  options: ListByCategoryOptions = {}
): Promise<PublicProduct[]> {
  const category = await Category.findOne({ _id: categoryId, isDeleted: false });
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  const filter: Record<string, unknown> = {
    categories: categoryId,
    isDeleted: false,
  };

  if (!options.includeUnavailable) {
    filter['isAvailable'] = true;
  }

  const products = await Product.find(filter).sort({ name: 1 });
  return products.map(toPublicProduct);
}

async function getById(id: string, options: ListByCategoryOptions = {}): Promise<PublicProduct> {
  const product = await getActiveById(id);

  if (!options.includeUnavailable && !product.isAvailable) {
    throw ApiError.notFound('Product not found');
  }

  return toPublicProduct(product);
}

async function create(input: CreateProductInput): Promise<PublicProduct> {
  const categories = await validateCategoryIds(input.categories);
  const ingredients = await validateIngredientIds(input.ingredients ?? []);
  const allowedExtras = await validateIngredientIds(input.allowedExtras ?? []);
  const extrasConfig = normalizeExtrasConfig(
    allowedExtras,
    input.freeExtrasCount ?? 0,
    input.pricePerExtra ?? 0
  );

  const product = await Product.create({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    image: input.image?.trim() || undefined,
    price: input.price,
    categories,
    ingredients,
    allowedExtras,
    freeExtrasCount: extrasConfig.freeExtrasCount,
    pricePerExtra: extrasConfig.pricePerExtra,
  });

  return toPublicProduct(product);
}

async function update(id: string, input: UpdateProductInput): Promise<PublicProduct> {
  const product = await getActiveById(id);

  if (input.name !== undefined) {
    product.name = input.name.trim();
  }

  if (input.description !== undefined) {
    product.description = input.description.trim() || undefined;
  }

  if (input.image !== undefined) {
    product.image = input.image.trim() || undefined;
  }

  if (input.price !== undefined) {
    product.price = input.price;
  }

  if (input.categories !== undefined) {
    product.categories = await validateCategoryIds(input.categories);
  }

  if (input.ingredients !== undefined) {
    product.ingredients = await validateIngredientIds(input.ingredients);
  }

  const allowedExtras =
    input.allowedExtras !== undefined
      ? await validateIngredientIds(input.allowedExtras)
      : product.allowedExtras;

  if (input.allowedExtras !== undefined) {
    product.allowedExtras = allowedExtras;
  }

  const freeExtrasCount =
    input.freeExtrasCount !== undefined ? input.freeExtrasCount : product.freeExtrasCount;
  const pricePerExtra =
    input.pricePerExtra !== undefined ? input.pricePerExtra : product.pricePerExtra;

  const extrasConfig = normalizeExtrasConfig(allowedExtras, freeExtrasCount, pricePerExtra);
  product.freeExtrasCount = extrasConfig.freeExtrasCount;
  product.pricePerExtra = extrasConfig.pricePerExtra;

  await product.save();
  return toPublicProduct(product);
}

async function setAvailability(id: string, isAvailable: boolean): Promise<PublicProduct> {
  const product = await getActiveById(id);
  product.isAvailable = isAvailable;
  await product.save();
  return toPublicProduct(product);
}

async function softDelete(id: string): Promise<PublicProduct> {
  const product = await getActiveById(id);
  product.isDeleted = true;
  await product.save();
  return toPublicProduct(product);
}

export const productService = {
  listByCategory,
  getById,
  create,
  update,
  setAvailability,
  softDelete,
};
