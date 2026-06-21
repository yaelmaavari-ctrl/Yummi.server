/**
 * Shared enums and types for the Yummi Food Ordering Management System.
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  KITCHEN = 'KITCHEN',
  DELIVERY = 'DELIVERY',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum IngredientStatus {
  AVAILABLE = 'AVAILABLE',
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

/**
 * Authenticated identity carried in the JWT payload.
 * Authorization is always based on `activeRole`.
 */
export interface JwtPayload {
  userId: string;
  activeRole: UserRole;
}

/**
 * Shape attached to `req.user` after the auth middleware verifies a token.
 */
export interface AuthenticatedUser {
  userId: string;
  activeRole: UserRole;
}
