import { Router } from 'express';
import { agentController } from '../controllers/agent.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { rateLimit } from '../middlewares/rateLimit.middleware';
import { agentChatSchema } from '../validations/agent.validation';

const router = Router();

// Every agent route requires a valid session.
router.use(authenticate);

// Bound cost/abuse: 20 agent messages per user per minute.
const agentRateLimit = rateLimit({ windowMs: 60_000, max: 20 });

router.post('/chat', agentRateLimit, validate(agentChatSchema), agentController.chat);

export default router;
