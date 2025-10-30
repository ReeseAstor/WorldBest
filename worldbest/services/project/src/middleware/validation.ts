import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createError } from './error-handler';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = createError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      errors.array()
    );
    next(error);
    return;
  }
  
  next();
};