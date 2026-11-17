import type { NextFunction, Request, Response } from 'express';
import { connectDB, getDBStatus, isDBConnected } from '../config/db.ts';

export async function requireDB(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isDBConnected()) {
    next();
    return;
  }

  const connected = await connectDB();
  if (connected) {
    next();
    return;
  }

  const status = getDBStatus();
  res.status(503).json({
    error: 'Database Unavailable',
    message:
      status.error ||
      'MongoDB Atlas is not connected. Set MONGODB_URI in your environment variables and restart the server.',
    code: 'DB_NOT_CONNECTED',
  });
}
