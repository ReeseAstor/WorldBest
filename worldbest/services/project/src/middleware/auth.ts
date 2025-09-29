import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    plan: string;
    teamId?: string;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'AUTH_001',
        message: 'Authorization header missing or invalid',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Attach user info to request
      (req as AuthenticatedRequest).user = {
        id: decoded.userId,
        email: decoded.email,
        plan: decoded.plan || 'story_starter',
        teamId: decoded.teamId,
      };
      
      next();
    } catch (jwtError) {
      logger.warn('JWT verification failed', { 
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        token: token.substring(0, 20) + '...' 
      });
      
      res.status(401).json({
        error: 'AUTH_002',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({
      error: 'AUTH_003',
      message: 'Authentication service error',
      timestamp: new Date().toISOString(),
    });
  }
};