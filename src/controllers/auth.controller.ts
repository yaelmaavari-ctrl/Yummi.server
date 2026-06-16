import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types';

const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const user = await authService.getMe(req.user.userId);
  res.status(200).json({ success: true, data: { user } });
});

const switchActiveRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const { activeRole } = req.body as { activeRole: UserRole };
  const result = await authService.switchActiveRole(req.user.userId, activeRole);
  res.status(200).json({ success: true, data: result });
});

export const authController = {
  register,
  login,
  getMe,
  switchActiveRole,
};
