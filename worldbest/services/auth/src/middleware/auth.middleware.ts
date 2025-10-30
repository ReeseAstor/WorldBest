import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/errors';
import { AuthErrorCode } from '@worldbest/shared-types';

const tokenService = new TokenService();
const userService = new UserService();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, AuthErrorCode.NO_TOKEN);
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = await tokenService.verifyAccessToken(token);
    
    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, AuthErrorCode.UNAUTHORIZED));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, AuthErrorCode.FORBIDDEN));
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const payload = await tokenService.verifyAccessToken(token);
      
      // Attach user to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      // Invalid token, continue without authentication
      // Log the error for monitoring
      console.warn('Optional auth: Invalid token provided', error);
    }

    next();
  } catch (error) {
    next(error);
  }
};