import bcrypt from 'bcryptjs';
import { User, IUser, IDefaultAddress } from '../models/user.model';
import { UserRole } from '../types';
import { ApiError } from '../utils/ApiError';

const SALT_ROUNDS = 12;

const EMPLOYEE_ROLES: UserRole[] = [UserRole.KITCHEN, UserRole.DELIVERY, UserRole.ADMIN];

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

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  roles: UserRole[];
  defaultAddress?: IDefaultAddress;
}

export interface UpdateRolesInput {
  roles: UserRole[];
}

export interface UpdateStatusInput {
  isActive: boolean;
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

async function createEmployee(input: CreateEmployeeInput): Promise<PublicUser> {
  const invalidRole = input.roles.find((r) => !EMPLOYEE_ROLES.includes(r));
  if (invalidRole) {
    throw ApiError.badRequest(`Role '${invalidRole}' cannot be assigned to an employee`);
  }

  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await User.create({
    fullName: input.fullName,
    email,
    passwordHash,
    phone: input.phone,
    roles: input.roles,
    defaultAddress: input.defaultAddress,
  });

  return toPublicUser(user);
}

async function getEmployees(): Promise<PublicUser[]> {
  const employees = await User.find({
    roles: { $not: { $eq: [UserRole.CUSTOMER] }, $elemMatch: { $in: EMPLOYEE_ROLES } },
  }).sort({ createdAt: -1 });

  return employees.map(toPublicUser);
}

async function getUserById(id: string): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
}

async function updateRoles(id: string, input: UpdateRolesInput): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.roles = input.roles;
  await user.save();

  return toPublicUser(user);
}

async function addRole(id: string, role: UserRole): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.roles.includes(role)) {
    throw ApiError.conflict(`User already has role '${role}'`);
  }

  user.roles.push(role);
  await user.save();

  return toPublicUser(user);
}

async function removeRole(id: string, role: UserRole): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!user.roles.includes(role)) {
    throw ApiError.notFound(`User does not have role '${role}'`);
  }

  if (user.roles.length === 1) {
    throw ApiError.badRequest('User must have at least one role');
  }

  user.roles = user.roles.filter((r) => r !== role);
  await user.save();

  return toPublicUser(user);
}

async function updateStatus(id: string, input: UpdateStatusInput): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.isActive = input.isActive;
  await user.save();

  return toPublicUser(user);
}

export const userService = {
  createEmployee,
  getEmployees,
  getUserById,
  updateRoles,
  addRole,
  removeRole,
  updateStatus,
};
