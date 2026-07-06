import { Request, Response } from 'express';
import { agentService, ChatHistoryMessage } from '../services/agent.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

/**
 * POST /api/agent/chat
 * Runs one AI agent turn. Thin controller: auth + trusted context are supplied
 * by middleware/JWT; all logic lives in the agent service.
 */
const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const { message, history } = req.body as {
    message: string;
    history: ChatHistoryMessage[];
  };

  const result = await agentService.chat(message, history ?? [], {
    userId: req.user.userId,
    activeRole: req.user.activeRole,
  });

  res.status(200).json({ success: true, data: result });
});

export const agentController = {
  chat,
};
