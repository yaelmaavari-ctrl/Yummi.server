import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

/**
 * User document. Owner: Developer A (Auth & Users).
 *
 * A single user may own multiple roles (CUSTOMER, KITCHEN, DELIVERY, ADMIN),
 * but only one role is active per session (encoded in the JWT as `activeRole`).
 * Passwords are stored as a bcryptjs hash and excluded from query results by
 * default (select: false). To compare passwords, explicitly select the field.
 */
export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.CUSTOMER],
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
