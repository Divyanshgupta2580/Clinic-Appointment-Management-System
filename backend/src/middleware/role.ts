import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole } from '../models/User';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden. This action requires one of: ${allowedRoles.join(', ')} role.`
        )
      );
    }

    next();
  };
};

export const requireDoctorOrStaff = requireRole(['doctor', 'receptionist', 'admin']);
export const requireReceptionistOrAdmin = requireRole(['receptionist', 'admin']);
export const requireAdmin = requireRole(['admin']);
