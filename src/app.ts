import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

const app: Application = express();

// Security & parsing middleware
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!isProduction) {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 + central error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
