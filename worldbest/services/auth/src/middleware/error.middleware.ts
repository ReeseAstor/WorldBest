import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle known errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: error.message,
      },
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      },
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      },
    });
  }

  // Handle database errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
        },
      });
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
    }
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};