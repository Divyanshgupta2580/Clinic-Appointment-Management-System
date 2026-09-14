import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { UserRole } from '../models/User';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const generateToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new UnauthorizedError('Authentication required. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    next(new UnauthorizedError('Invalid or expired authentication session. Please log in again.'));
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    next();
  }
};
