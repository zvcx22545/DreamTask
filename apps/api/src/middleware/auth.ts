import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.js';
import { config } from '../config.js';

export interface AuthPayload {
  sub: string; // userId
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or malformed Authorization header', 'UNAUTHORIZED');
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired access token', 'TOKEN_INVALID');
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    throw new AppError(403, 'Admin access required', 'FORBIDDEN');
  }
  next();
}

export function requireSuperDev(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'SUPER_DEV') {
    throw new AppError(403, 'SuperDev access required', 'FORBIDDEN');
  }
  next();
}
