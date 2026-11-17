import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { connectDB, getDBStatus } from './config/db.ts';
import aiRoutes from './routes/ai.ts';
import applicationRoutes from './routes/applications.ts';
import authRoutes from './routes/auth.ts';
import dashboardRoutes from './routes/dashboard.ts';

export function createApiApp() {
  const api = express();

  api.use(cors());
  api.use(express.json({ limit: '2mb' }));
  api.use(express.urlencoded({ extended: true }));

  api.get('/health', (_req, res) => {
    const db = getDBStatus();
    res.json({
      status: 'ok',
      dbConnected: db.connected,
      dbConfigured: db.configured,
      dbError: db.error,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
          process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
      ),
    });
  });

  api.post('/health/reconnect', async (_req, res) => {
    await connectDB(true);
    const db = getDBStatus();
    res.status(db.connected ? 200 : 503).json({
      status: db.connected ? 'ok' : 'unavailable',
      dbConnected: db.connected,
      dbConfigured: db.configured,
      dbError: db.error,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
          process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
      ),
    });
  });

  api.use('/auth', authRoutes);
  api.use('/applications', applicationRoutes);
  api.use('/ai', aiRoutes);
  api.use('/dashboard', dashboardRoutes);

  api.use((_req, res) => {
    res.status(404).json({ message: 'API endpoint not found.' });
  });

  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      statusCode?: number;
      status?: number;
      code?: number;
      message?: string;
      name?: string;
    };
    console.error('[API Error]', error?.message || err);

    if (error?.name === 'ValidationError') {
      res.status(400).json({ message: error.message || 'Validation failed.' });
      return;
    }

    if (error?.code === 11000) {
      res.status(409).json({ message: 'A record with this value already exists.' });
      return;
    }

    const status = error?.statusCode || error?.status || 500;
    res.status(status).json({
      message: error?.message || 'Internal server error.',
    });
  });

  return api;
}
