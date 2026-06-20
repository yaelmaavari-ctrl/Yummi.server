import { Request, Response } from 'express';
import { deliveryZoneService } from '../services/deliveryZone.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '../types';

const list = asyncHandler(async (req: Request, res: Response) => {
  const adminView = req.user!.activeRole === UserRole.ADMIN;
  const zones = await deliveryZoneService.list({ adminView });
  res.status(200).json({ success: true, data: { zones } });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.getById(req.params['id'] as string);
  res.status(200).json({ success: true, data: { zone } });
});

const checkCity = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.checkCity(req.params['city'] as string);
  res.status(200).json({ success: true, data: { zone } });
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.create(req.body);
  res.status(201).json({ success: true, data: { zone } });
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.update(req.params['id'] as string, req.body);
  res.status(200).json({ success: true, data: { zone } });
});

const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.setStatus(
    req.params['id'] as string,
    req.body.isActive as boolean,
  );
  res.status(200).json({ success: true, data: { zone } });
});

const remove = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.remove(req.params['id'] as string);
  res.status(200).json({ success: true, data: { zone } });
});

export const deliveryZoneController = {
  list,
  getById,
  checkCity,
  create,
  update,
  setStatus,
  remove,
};
