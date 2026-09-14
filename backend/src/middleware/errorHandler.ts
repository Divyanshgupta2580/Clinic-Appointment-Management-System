import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'An unexpected error occurred. Please try again later.';
  let errors = err.errors;
  let suggestedSlot = err.suggestedSlot;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for field: ${err.path}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e: any) => e.message);
    message = 'Validation error occurred.';
  }

  // Handle MongoDB duplicate key error code 11000
  if (err.code === 11000) {
    statusCode = 409;
    message = 'The requested resource or appointment slot is already taken.';
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(suggestedSlot ? { suggestedSlot } : {}),
  });
};
