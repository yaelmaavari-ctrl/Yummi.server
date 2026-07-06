import { Types } from 'mongoose';
import { Category } from '../models/category.model';
import { Ingredient } from '../models/ingredient.model';
import { IProduct, Product } from '../models/product.model';
import { IngredientStatus } from '../types';
import { ApiError } from '../utils/ApiError';

export interface IngredientSummary {
  id: string;
  name: string;
  status: IngredientStatus;
}

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
  baseIngredients?: IngredientSummary[];
  extraIngredients?: IngredientSummary[];
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
  includeIngredientDetails?: boolean;
}

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  includeUnavailable?: boolean;
  includeIngredientDetails?: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

async function loadIngredientSummaryMap(
  products: IProduct[]
): Promise<Map<string, IngredientSummary>> {
  const ingredientIds = new Set<string>();

  for (const product of products) {
    product.ingredients.forEach((id) => ingredientIds.add(id.toString()));
    product.allowedExtras.forEach((id) => ingredientIds.add(id.toString()));
  }

  if (ingredientIds.size === 0) {
    return new Map();
  }

  const ingredients = await Ingredient.find({ _id: { $in: [...ingredientIds] } });
  return new Map(
    ingredients.map((ingredient) => [
      ingredient._id.toString(),
      {
        id: ingredient._id.toString(),
        name: ingredient.name,
        status: ingredient.status,
      },
    ])
  );
}

function applyIngredientAvailability(
  product: IProduct,
  ingredientMap: Map<string, IngredientSummary>,
  includeDetails: boolean
): PublicProduct {
  const baseIngredients = product.ingredients
    .map((id) => ingredientMap.get(id.toString()))
    .filter((item): item is IngredientSummary => Boolean(item));

  const extraIngredients = product.allowedExtras
    .map((id) => ingredientMap.get(id.toString()))
    .filter((item): item is IngredientSummary => Boolean(item));

  const allBaseAvailable = baseIngredients.every(
    (item) => item.status === IngredientStatus.AVAILABLE
  );
  const availableExtras = extraIngredients
    .filter((item) => item.status === IngredientStatus.AVAILABLE)
    .map((item) => item.id);

  const publicProduct = toPublicProduct(product);
  publicProduct.isAvailable = product.isAvailable && allBaseAvailable;
  publicProduct.allowedExtras = availableExtras;

  if (includeDetails) {
    publicProduct.baseIngredients = baseIngredients;
    publicProduct.extraIngredients = extraIngredients;
  }

  return publicProduct;
}

async function mapProductsWithIngredientAvailability(
  products: IProduct[],
  options: { includeUnavailable: boolean; includeDetails: boolean }
): Promise<PublicProduct[]> {
  const ingredientMap = await loadIngredientSummaryMap(products);

  const mapped = products.map((product) =>
    applyIngredientAvailability(product, ingredientMap, options.includeDetails)
  );

  if (options.includeUnavailable) {
    return mapped;
  }

  return mapped.filter((product) => product.isAvailable);
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

async function list(options: ListProductsOptions = {}): Promise<PublicProduct[]> {
  const filter: Record<string, unknown> = { isDeleted: false };

  if (!options.includeUnavailable) {
    filter['isAvailable'] = true;
  }

  if (options.categoryId) {
    filter['categories'] = new Types.ObjectId(options.categoryId);
  }

  if (options.search) {
    filter['name'] = { $regex: new RegExp(escapeRegex(options.search.trim()), 'i') };
  }

  const products = await Product.find(filter).sort({ name: 1 });
  return mapProductsWithIngredientAvailability(products, {
    includeUnavailable: options.includeUnavailable ?? false,
    includeDetails: options.includeIngredientDetails ?? false,
  });
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
  return mapProductsWithIngredientAvailability(products, {
    includeUnavailable: options.includeUnavailable ?? false,
    includeDetails: options.includeIngredientDetails ?? false,
  });
}

async function getById(id: string, options: ListByCategoryOptions = {}): Promise<PublicProduct> {
  const product = await getActiveById(id);

  const [publicProduct] = await mapProductsWithIngredientAvailability([product], {
    includeUnavailable: options.includeUnavailable ?? false,
    includeDetails: options.includeIngredientDetails ?? false,
  });

  if (!publicProduct) {
    throw ApiError.notFound('Product not found');
  }

  return publicProduct;
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
  list,
  listByCategory,
  getById,
  create,
  update,
  setAvailability,
  softDelete,
};
