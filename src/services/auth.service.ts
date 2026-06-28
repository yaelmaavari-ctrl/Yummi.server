import bcrypt from 'bcryptjs';
import { User, IDefaultAddress, IUser } from '../models/user.model';
import { UserRole } from '../types';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

const SALT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roles: UserRole[];
  defaultAddress?: IDefaultAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  defaultAddress?: IDefaultAddress;
}

export interface LoginInput {
  email: string;
  password: string;
  activeRole?: UserRole;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  defaultAddress?: IDefaultAddress | null;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function toPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    defaultAddress: user.defaultAddress,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function resolveActiveRole(roles: UserRole[], requestedRole?: UserRole): UserRole {
  if (requestedRole) {
    if (!roles.includes(requestedRole)) {
      throw ApiError.forbidden('You do not have the requested role');
    }
    return requestedRole;
  }

  if (roles.includes(UserRole.CUSTOMER)) {
    return UserRole.CUSTOMER;
  }

  return roles[0];
}

function assertUserIsActive(user: IUser): void {
  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }
}

async function register(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await User.create({
    fullName: input.fullName,
    email,
    passwordHash,
    phone: input.phone,
    roles: [UserRole.CUSTOMER],
    defaultAddress: input.defaultAddress,
  });

  const activeRole = UserRole.CUSTOMER;
  const token = signToken(user._id.toString(), activeRole);

  return {
    user: toPublicUser(user),
    token,
  };
}

async function login(input: LoginInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  assertUserIsActive(user);

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const activeRole = resolveActiveRole(user.roles, input.activeRole);
  const token = signToken(user._id.toString(), activeRole);

  return {
    user: toPublicUser(user),
    token,
  };
}

async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  assertUserIsActive(user);

  return toPublicUser(user);
}

async function switchActiveRole(userId: string, activeRole: UserRole): Promise<AuthResult> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  assertUserIsActive(user);

  if (!user.roles.includes(activeRole)) {
    throw ApiError.forbidden('You do not have the requested role');
  }

  const token = signToken(user._id.toString(), activeRole);

  return {
    user: toPublicUser(user),
    token,
  };
}

async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  assertUserIsActive(user);

  if (input.fullName !== undefined) {
    user.fullName = input.fullName;
  }
  if (input.phone !== undefined) {
    user.phone = input.phone;
  }
  if (input.defaultAddress !== undefined) {
    user.defaultAddress = input.defaultAddress ?? undefined;
  }

  await user.save();

  return toPublicUser(user);
}

export const authService = {
  register,
  login,
  getMe,
  switchActiveRole,
  updateProfile,
};
