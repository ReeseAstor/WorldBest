import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt';
import { prisma } from '@worldbest/database';
import { logger, logSecurity } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tokenId: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'No access token provided.',
      });
    }

    // Verify token
    const payload = await jwtService.verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      logSecurity('Token used for non-existent user', { userId: payload.userId, tokenId: payload.tokenId });
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found.',
      });
    }

    // Check email verification if required
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address.',
        needsEmailVerification: true,
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      tokenId: payload.tokenId,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Access token has expired.',
          needsRefresh: true,
        });
      }
      
      if (error.message.includes('revoked')) {
        return res.status(401).json({
          error: 'Token revoked',
          message: 'Access token has been revoked.',
        });
      }
    }

    res.status(401).json({
      error: 'Invalid token',
      message: 'The access token is invalid.',
    });
  }
};

/**
 * Middleware to optionally authenticate token (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      return next();
    }

    // Try to verify token
    const payload = await jwtService.verifyAccessToken(token);
    
    // Verify user still exists
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (user && user.emailVerified) {
      req.user = {
        id: user.id,
        email: user.email,
        tokenId: payload.tokenId,
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

/**
 * Middleware to check if user has specific permissions
 */
export const requirePermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource.',
        });
      }

      // Get user with permissions
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          plan: true,
          // Add any permission-related fields
        },
      });

      if (!user) {
        return res.status(401).json({
          error: 'User not found',
        });
      }

      // Check permissions based on plan or specific permissions
      // This is a simplified implementation - expand based on your permission system
      const hasPermission = permissions.every(permission => {
        switch (permission) {
          case 'basic':
            return true; // All authenticated users have basic permissions
          case 'premium':
            return ['solo_author', 'pro_creator', 'studio_team', 'enterprise'].includes(user.plan);
          case 'team':
            return ['studio_team', 'enterprise'].includes(user.plan);
          case 'admin':
            return user.plan === 'enterprise'; // Simplified admin check
          default:
            return false;
        }
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this resource.',
          requiredPermissions: permissions,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while checking permissions.',
      });
    }
  };
};

/**
 * Middleware to check subscription plan
 */
export const requirePlan = (plans: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          plan: true,
          subscriptions: {
            where: {
              status: 'active',
            },
            select: {
              plan: true,
              status: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          error: 'User not found',
        });
      }

      const userPlan = user.subscriptions[0]?.plan || user.plan;
      
      if (!plans.includes(userPlan)) {
        return res.status(403).json({
          error: 'Subscription required',
          message: 'This feature requires a higher subscription plan.',
          currentPlan: userPlan,
          requiredPlans: plans,
        });
      }

      next();
    } catch (error) {
      logger.error('Plan check error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
};

/**
 * Middleware to validate API key (alternative to JWT)
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'No API key provided.',
      });
    }

    // Hash the API key for lookup
    const bcrypt = require('bcryptjs');
    
    // Find API key in database
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        revoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            plan: true,
            deletedAt: true,
          },
        },
      },
    });

    // Verify API key hash
    let validKey = null;
    if (apiKeyRecord) {
      const isValid = await bcrypt.compare(apiKey, apiKeyRecord.keyHash);
      if (isValid) {
        validKey = apiKeyRecord;
      }
    }

    if (!validKey || validKey.user.deletedAt) {
      logSecurity('Invalid API key used', { ip: req.ip, keyPreview: apiKey.substring(0, 8) + '...' });
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or expired.',
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: validKey.id },
      data: { lastUsed: new Date() },
    });

    // Attach user to request
    req.user = {
      id: validKey.user.id,
      email: validKey.user.email,
      tokenId: validKey.id, // Use API key ID as token ID
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

/**
 * Middleware for rate limiting per user
 */
export const rateLimitPerUser = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(); // Skip if no user (should be handled by auth middleware)
      }

      const key = `rate_limit:user:${req.user.id}`;
      const { redisService } = require('../services/redis');
      
      const requests = await redisService.incrementRateLimit(key, windowMs);
      
      if (requests > maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - requests).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Don't fail the request if rate limiting fails
    }
  };
};