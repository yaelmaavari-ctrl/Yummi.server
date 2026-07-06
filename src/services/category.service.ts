import { Types } from 'mongoose';
import { Category, ICategory } from '../models/category.model';
import { Product } from '../models/product.model';
import { ApiError } from '../utils/ApiError';

export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  image?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  image?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPublicCategory(category: ICategory): PublicCategory {
  return {
    id: category._id.toString(),
    name: category.name,
    description: category.description,
    image: category.image,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function findActiveByName(name: string, excludeId?: string): Promise<ICategory | null> {
  const filter: Record<string, unknown> = {
    name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
    isDeleted: false,
  };

  if (excludeId) {
    filter['_id'] = { $ne: excludeId };
  }

  return Category.findOne(filter);
}

async function getActiveById(id: string): Promise<ICategory> {
  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return category;
}

async function list(): Promise<PublicCategory[]> {
  const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });
  return categories.map(toPublicCategory);
}

async function getById(id: string): Promise<PublicCategory> {
  const category = await getActiveById(id);
  return toPublicCategory(category);
}

async function create(input: CreateCategoryInput): Promise<PublicCategory> {
  const name = input.name.trim();

  const existing = await findActiveByName(name);
  if (existing) {
    throw ApiError.conflict('Category name already exists');
  }

  const category = await Category.create({
    name,
    description: input.description?.trim() || undefined,
    image: input.image?.trim() || undefined,
  });

  return toPublicCategory(category);
}

async function update(id: string, input: UpdateCategoryInput): Promise<PublicCategory> {
  const category = await getActiveById(id);

  if (input.name !== undefined) {
    const name = input.name.trim();
    const existing = await findActiveByName(name, id);
    if (existing) {
      throw ApiError.conflict('Category name already exists');
    }
    category.name = name;
  }

  if (input.description !== undefined) {
    category.description = input.description.trim() || undefined;
  }

  if (input.image !== undefined) {
    category.image = input.image.trim() || undefined;
  }

  await category.save();
  return toPublicCategory(category);
}

async function softDelete(id: string): Promise<PublicCategory> {
  const category = await getActiveById(id);

  const activeProductCount = await Product.countDocuments({
    categories: new Types.ObjectId(id),
    isDeleted: false,
  });

  if (activeProductCount > 0) {
    throw ApiError.conflict('Cannot delete category while active products exist');
  }

  category.isDeleted = true;
  await category.save();

  return toPublicCategory(category);
}

export const categoryService = {
  list,
  getById,
  create,
  update,
  softDelete,
};
