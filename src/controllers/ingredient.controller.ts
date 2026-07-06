import { Request, Response } from 'express';
import { ingredientService } from '../services/ingredient.service';
import { asyncHandler } from '../utils/asyncHandler';
import { emitEvent, SocketEvents } from '../sockets/events';
import { IngredientStatus } from '../types';

const list = asyncHandler(async (_req: Request, res: Response) => {
  const ingredients = await ingredientService.list();
  res.status(200).json({ success: true, data: { ingredients } });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.getById(req.params['id'] as string);
  res.status(200).json({ success: true, data: { ingredient } });
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.create(req.body);
  res.status(201).json({ success: true, data: { ingredient } });
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.update(
    req.params['id'] as string,
    req.body.name as string
  );
  res.status(200).json({ success: true, data: { ingredient } });
});

const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.setStatus(
    req.params['id'] as string,
    req.body.status as IngredientStatus
  );

  emitEvent(SocketEvents.INGREDIENT_AVAILABILITY_CHANGED, {
    ingredientId: ingredient.id,
    name: ingredient.name,
    status: ingredient.status,
  });

  res.status(200).json({ success: true, data: { ingredient } });
});

const remove = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.remove(req.params['id'] as string);
  res.status(200).json({ success: true, data: { ingredient } });
});

const reportShortage = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.reportShortage(
    req.params['id'] as string,
    req.user!.userId,
    req.body.message as string | undefined
  );
  res.status(200).json({ success: true, data: { ingredient } });
});

const replenish = asyncHandler(async (req: Request, res: Response) => {
  const ingredient = await ingredientService.replenish(
    req.params['id'] as string,
    req.user!.userId,
    req.body.notificationId as string | undefined
  );

  emitEvent(SocketEvents.INGREDIENT_AVAILABILITY_CHANGED, {
    ingredientId: ingredient.id,
    name: ingredient.name,
    status: ingredient.status,
  });

  res.status(200).json({ success: true, data: { ingredient } });
});

export const ingredientController = {
  list,
  getById,
  create,
  update,
  setStatus,
  remove,
  reportShortage,
  replenish,
};
