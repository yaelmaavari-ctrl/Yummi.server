import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '../types';

const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createEmployee(req.body);
  res.status(201).json({ success: true, data: { user } });
});

const getEmployees = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.getEmployees();
  res.status(200).json({ success: true, data: { users } });
});

const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params['id'] as string);
  res.status(200).json({ success: true, data: { user } });
});

const updateRoles = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateRoles(req.params['id'] as string, req.body);
  res.status(200).json({ success: true, data: { user } });
});

const addRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: UserRole };
  const user = await userService.addRole(req.params['id'] as string, role);
  res.status(200).json({ success: true, data: { user } });
});

const removeRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.removeRole(
    req.params['id'] as string,
    req.params['role'] as UserRole
  );
  res.status(200).json({ success: true, data: { user } });
});

const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateStatus(req.params['id'] as string, req.body);
  res.status(200).json({ success: true, data: { user } });
});

export const userController = {
  createEmployee,
  getEmployees,
  getUserById,
  updateRoles,
  addRole,
  removeRole,
  updateStatus,
};
