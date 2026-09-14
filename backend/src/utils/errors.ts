export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: string[];

  constructor(message: string, statusCode: number = 500, errors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  public suggestedSlot?: any;

  constructor(message: string = 'Resource conflict', suggestedSlot?: any) {
    super(message, 409);
    this.suggestedSlot = suggestedSlot;
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors?: string[]) {
    super(message, 400, errors);
  }
}
