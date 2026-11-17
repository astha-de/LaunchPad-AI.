import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.');
  }
  return 'launchpad-ai-local-dev-jwt-secret';
}

export function signAuthToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '7d' });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is missing. Please log in again.',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is empty. Please log in again.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!decoded.userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token.',
      });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session expired or invalid token. Please log in again.',
    });
  }
}
