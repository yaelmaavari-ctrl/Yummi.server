import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

/**
 * User document. Owner: Developer A (Auth & Users).
 *
 * A single user may own multiple roles (CUSTOMER, KITCHEN, DELIVERY, ADMIN),
 * but only one role is active per session (encoded in the JWT as `activeRole`).
 *
 * TODO (Developer A): define the full schema, e.g.:
 *   - fullName: string
 *   - email: string (unique, lowercased)
 *   - passwordHash: string (hashed with bcryptjs)
 *   - phone: string
 *   - roles: UserRole[]
 *   - defaultAddress: { city, street, houseNumber }
 *   - isActive: boolean
 */
export interface IUser extends Document {
  // TODO: define fields
  roles: UserRole[];
}

const userSchema = new Schema<IUser>(
  {
    // TODO: define schema fields
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.CUSTOMER],
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
