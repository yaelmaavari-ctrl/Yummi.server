import { DeliveryZone, IDeliveryZone } from '../models/deliveryZone.model';
import { ApiError } from '../utils/ApiError';

export interface PublicDeliveryZone {
  id: string;
  city: string;
  deliveryPrice: number;
  estimatedDeliveryMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryZoneInput {
  city: string;
  deliveryPrice: number;
  estimatedDeliveryMinutes: number;
}

export interface UpdateDeliveryZoneInput {
  city?: string;
  deliveryPrice?: number;
  estimatedDeliveryMinutes?: number;
}

function toPublicDeliveryZone(zone: IDeliveryZone): PublicDeliveryZone {
  return {
    id: zone._id.toString(),
    city: zone.city,
    deliveryPrice: zone.deliveryPrice,
    estimatedDeliveryMinutes: zone.estimatedDeliveryMinutes,
    isActive: zone.isActive,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findActiveByCity(city: string, excludeId?: string): Promise<IDeliveryZone | null> {
  const filter: Record<string, unknown> = {
    city: { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') },
    isDeleted: false,
  };

  if (excludeId) {
    filter['_id'] = { $ne: excludeId };
  }

  return DeliveryZone.findOne(filter);
}

async function getExistingById(id: string): Promise<IDeliveryZone> {
  const zone = await DeliveryZone.findOne({ _id: id, isDeleted: false });
  if (!zone) {
    throw ApiError.notFound('Delivery zone not found');
  }
  return zone;
}

/**
 * Returns all non-deleted zones.
 * - Admins receive all zones (active and inactive).
 * - All other roles receive only active zones.
 */
async function list(options: { adminView?: boolean } = {}): Promise<PublicDeliveryZone[]> {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (!options.adminView) {
    filter['isActive'] = true;
  }

  const zones = await DeliveryZone.find(filter).sort({ city: 1 });
  return zones.map(toPublicDeliveryZone);
}

async function getById(id: string): Promise<PublicDeliveryZone> {
  const zone = await getExistingById(id);
  return toPublicDeliveryZone(zone);
}

/**
 * Checks whether a city is currently supported for delivery.
 * Used by order placement to validate delivery orders.
 * Throws 404 if the city is not found or not active.
 */
async function checkCity(city: string): Promise<PublicDeliveryZone> {
  const zone = await DeliveryZone.findOne({
    city: { $regex: new RegExp(`^${escapeRegex(city.trim())}$`, 'i') },
    isDeleted: false,
    isActive: true,
  });

  if (!zone) {
    throw ApiError.notFound(
      'This city is not supported for delivery. You may place a pickup order instead.'
    );
  }

  return toPublicDeliveryZone(zone);
}

async function create(input: CreateDeliveryZoneInput): Promise<PublicDeliveryZone> {
  const city = input.city.trim();

  const existing = await findActiveByCity(city);
  if (existing) {
    throw ApiError.conflict('A delivery zone for this city already exists');
  }

  const zone = await DeliveryZone.create({
    city,
    deliveryPrice: input.deliveryPrice,
    estimatedDeliveryMinutes: input.estimatedDeliveryMinutes,
  });

  return toPublicDeliveryZone(zone);
}

async function update(id: string, input: UpdateDeliveryZoneInput): Promise<PublicDeliveryZone> {
  const zone = await getExistingById(id);

  if (input.city !== undefined) {
    const city = input.city.trim();
    const existing = await findActiveByCity(city, id);
    if (existing) {
      throw ApiError.conflict('A delivery zone for this city already exists');
    }
    zone.city = city;
  }

  if (input.deliveryPrice !== undefined) {
    zone.deliveryPrice = input.deliveryPrice;
  }

  if (input.estimatedDeliveryMinutes !== undefined) {
    zone.estimatedDeliveryMinutes = input.estimatedDeliveryMinutes;
  }

  await zone.save();
  return toPublicDeliveryZone(zone);
}

async function setStatus(id: string, isActive: boolean): Promise<PublicDeliveryZone> {
  const zone = await getExistingById(id);
  zone.isActive = isActive;
  await zone.save();
  return toPublicDeliveryZone(zone);
}

async function remove(id: string): Promise<PublicDeliveryZone> {
  const zone = await getExistingById(id);
  zone.isDeleted = true;
  await zone.save();
  return toPublicDeliveryZone(zone);
}

export const deliveryZoneService = {
  list,
  getById,
  checkCity,
  create,
  update,
  setStatus,
  remove,
};
