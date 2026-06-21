import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

/**
 * Nested address subdocument. Matches the delivery address shape used by orders.
 */
export interface IDefaultAddress {
  city: string;
  street: string;
  houseNumber: string;
}

/**
 * User document. Owner: Developer A (Auth & Users).
 *
 * A single user may own multiple roles (CUSTOMER, KITCHEN, DELIVERY, ADMIN),
 * but only one role is active per session (encoded in the JWT as `activeRole`).
 *
 * Password hashing is handled in auth.service.ts; this model stores `passwordHash` only.
 * Users are deactivated via `isActive: false` (not soft-deleted).
 */
export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phone: string;
  roles: UserRole[];
  defaultAddress?: IDefaultAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const defaultAddressSchema = new Schema<IDefaultAddress>(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    street: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    houseNumber: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 20,
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 1,
      select: false,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 7,
      maxlength: 20,
    },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      required: true,
      default: [UserRole.CUSTOMER],
      validate: {
        validator: (roles: UserRole[]): boolean => {
          if (roles.length < 1) {
            return false;
          }
          return new Set(roles).size === roles.length;
        },
        message: 'roles must contain at least one unique role',
      },
    },
    defaultAddress: {
      type: defaultAddressSchema,
      required: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ roles: 1 });

export const User = model<IUser>('User', userSchema);