import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getPrismaClient } from '../utils/database';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Find user
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if session is still valid
    const session = await prisma.session.findFirst({
      where: {
        id: decoded.sessionId,
        user_id: user.id,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Session expired',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  }
}

export async function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

export async function requirePlan(plans: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userPlan = req.user.plan;
    const hasRequiredPlan = plans.includes(userPlan);

    if (!hasRequiredPlan) {
      res.status(403).json({
        success: false,
        message: 'Upgrade required',
        required_plan: plans[0],
      });
      return;
    }

    next();
  };
}