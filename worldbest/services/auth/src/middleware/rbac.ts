import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbac';
import { logger, logSecurity } from '../utils/logger';

// Extend the Request interface to include user permissions
declare global {
  namespace Express {
    interface Request {
      userPermissions?: import('../services/rbac').UserPermissions;
    }
  }
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
      }

      const userId = req.user.id;
      const hasPermission = await rbacService.hasPermission(userId, resource, action);

      if (!hasPermission) {
        logSecurity('Permission denied', {
          userId,
          resource,
          action,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `You do not have permission to ${action} ${resource}.`,
          required: `${resource}:${action}`,
        });
      }

      // Optionally add user permissions to request for later use
      if (!req.userPermissions) {
        req.userPermissions = await rbacService.getUserPermissions(userId);
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions.',
      });
    }
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
      }

      const userId = req.user.id;
      const userPermissions = await rbacService.getUserPermissions(userId);

      const hasAnyPermission = permissions.some(perm =>
        userPermissions.canAccess(perm.resource, perm.action)
      );

      if (!hasAnyPermission) {
        logSecurity('Permission denied - none of required permissions found', {
          userId,
          requiredPermissions: permissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have any of the required permissions.',
          required: permissions.map(p => `${p.resource}:${p.action}`),
        });
      }

      // Add user permissions to request
      req.userPermissions = userPermissions;

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions.',
      });
    }
  };
}

/**
 * Middleware to check if user has all required permissions
 */
export function requireAllPermissions(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
        });
      }

      const userId = req.user.id;
      const userPermissions = await rbacService.getUserPermissions(userId);

      const hasAllPermissions = permissions.every(perm =>
        userPermissions.canAccess(perm.resource, perm.action)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(perm =>
          !userPermissions.canAccess(perm.resource, perm.action)
        );

        logSecurity('Permission denied - missing required permissions', {
          userId,
          missingPermissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You are missing some required permissions.',
          required: permissions.map(p => `${p.resource}:${p.action}`),
          missing: missingPermissions.map(p => `${p.resource}:${p.action}`),
        });
      }

      // Add user permissions to request
      req.userPermissions = userPermissions;

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions.',
      });
    }
  };
}

/**
 * Middleware to add user permissions to request without enforcing any checks
 */
export async function addUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user && !req.userPermissions) {
      req.userPermissions = await rbacService.getUserPermissions(req.user.id);
    }
    next();
  } catch (error) {
    logger.error('Error adding user permissions:', error);
    // Don't fail the request, just continue without permissions
    next();
  }
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requirePermission('admin', 'system');

/**
 * Helper function to create permission requirement
 */
export function perm(resource: string, action: string) {
  return { resource, action };
}

// Common permission combinations
export const PERMISSIONS = {
  // Project permissions
  PROJECT_READ: perm('project', 'read'),
  PROJECT_WRITE: perm('project', 'write'),
  PROJECT_DELETE: perm('project', 'delete'),
  PROJECT_SHARE: perm('project', 'share'),
  PROJECT_EXPORT: perm('project', 'export'),

  // Content permissions
  CONTENT_READ: perm('content', 'read'),
  CONTENT_WRITE: perm('content', 'write'),
  CONTENT_DELETE: perm('content', 'delete'),
  CONTENT_PUBLISH: perm('content', 'publish'),

  // AI permissions
  AI_GENERATE: perm('ai', 'generate'),
  AI_CONFIGURE: perm('ai', 'configure'),
  AI_TRAIN: perm('ai', 'train'),

  // Team permissions
  TEAM_READ: perm('team', 'read'),
  TEAM_WRITE: perm('team', 'write'),
  TEAM_INVITE: perm('team', 'invite'),
  TEAM_REMOVE: perm('team', 'remove'),

  // Admin permissions
  ADMIN_USERS: perm('admin', 'users'),
  ADMIN_SYSTEM: perm('admin', 'system'),
  ADMIN_AUDIT: perm('admin', 'audit'),

  // Billing permissions
  BILLING_READ: perm('billing', 'read'),
  BILLING_WRITE: perm('billing', 'write'),

  // Analytics permissions
  ANALYTICS_READ: perm('analytics', 'read'),
  ANALYTICS_EXPORT: perm('analytics', 'export'),
};