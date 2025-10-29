import { prisma } from '@worldbest/database';
import { logger } from '../utils/logger';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  permissions: Permission[];
  canAccess: (resource: string, action: string) => boolean;
}

interface CacheEntry {
  permissions: Permission[];
  roles: Role[];
  timestamp: number;
}

export class RBACService {
  private permissionsCache = new Map<string, CacheEntry>();
  private rolesCache = new Map<string, Role[]>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaultRoles() {
    try {
      // Define default permissions
      const defaultPermissions = [
        // User management
        { name: 'user:read', resource: 'user', action: 'read', description: 'View user profiles' },
        { name: 'user:write', resource: 'user', action: 'write', description: 'Edit user profiles' },
        { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete user accounts' },
        
        // Project management
        { name: 'project:create', resource: 'project', action: 'create', description: 'Create new projects' },
        { name: 'project:read', resource: 'project', action: 'read', description: 'View projects' },
        { name: 'project:write', resource: 'project', action: 'write', description: 'Edit projects' },
        { name: 'project:delete', resource: 'project', action: 'delete', description: 'Delete projects' },
        { name: 'project:share', resource: 'project', action: 'share', description: 'Share projects with others' },
        { name: 'project:export', resource: 'project', action: 'export', description: 'Export projects' },
        
        // Content management
        { name: 'content:create', resource: 'content', action: 'create', description: 'Create content' },
        { name: 'content:read', resource: 'content', action: 'read', description: 'View content' },
        { name: 'content:write', resource: 'content', action: 'write', description: 'Edit content' },
        { name: 'content:delete', resource: 'content', action: 'delete', description: 'Delete content' },
        { name: 'content:publish', resource: 'content', action: 'publish', description: 'Publish content' },
        
        // AI features
        { name: 'ai:generate', resource: 'ai', action: 'generate', description: 'Use AI generation features' },
        { name: 'ai:train', resource: 'ai', action: 'train', description: 'Train custom AI models' },
        { name: 'ai:configure', resource: 'ai', action: 'configure', description: 'Configure AI settings' },
        
        // Team management
        { name: 'team:create', resource: 'team', action: 'create', description: 'Create teams' },
        { name: 'team:read', resource: 'team', action: 'read', description: 'View team information' },
        { name: 'team:write', resource: 'team', action: 'write', description: 'Edit team settings' },
        { name: 'team:delete', resource: 'team', action: 'delete', description: 'Delete teams' },
        { name: 'team:invite', resource: 'team', action: 'invite', description: 'Invite team members' },
        { name: 'team:remove', resource: 'team', action: 'remove', description: 'Remove team members' },
        
        // Billing
        { name: 'billing:read', resource: 'billing', action: 'read', description: 'View billing information' },
        { name: 'billing:write', resource: 'billing', action: 'write', description: 'Manage billing settings' },
        
        // Analytics
        { name: 'analytics:read', resource: 'analytics', action: 'read', description: 'View analytics' },
        { name: 'analytics:export', resource: 'analytics', action: 'export', description: 'Export analytics data' },
        
        // Admin
        { name: 'admin:users', resource: 'admin', action: 'users', description: 'Manage all users' },
        { name: 'admin:system', resource: 'admin', action: 'system', description: 'System administration' },
        { name: 'admin:audit', resource: 'admin', action: 'audit', description: 'View audit logs' },
      ];

      // Create permissions if they don't exist
      for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
          where: { name: perm.name },
          update: {
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          },
          create: perm,
        });
      }

      logger.info('Default permissions created');
    } catch (error) {
      logger.error('Error initializing default roles:', error);
      throw error;
    }
  }

  /**
   * Get user permissions (from roles and direct permissions)
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      // Check cache first
      const cacheKey = `user_permissions:${userId}`;
      const cached = this.permissionsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return this.buildUserPermissions(userId, cached.permissions, cached.roles);
      }

      // Return default permissions for now (implement database logic later)
      const permissions: Permission[] = [
        { id: '1', name: 'project:read', resource: 'project', action: 'read' },
        { id: '2', name: 'content:read', resource: 'content', action: 'read' },
      ];
      
      const roles: Role[] = [];

      // Cache results
      this.permissionsCache.set(cacheKey, {
        permissions,
        roles,
        timestamp: Date.now(),
      });

      return this.buildUserPermissions(userId, permissions, roles);
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.canAccess(resource, action);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  // Private helper methods
  private buildUserPermissions(userId: string, permissions: Permission[], roles: Role[]): UserPermissions {
    return {
      userId,
      roles,
      permissions,
      canAccess: (resource: string, action: string) => {
        return permissions.some(p => p.resource === resource && p.action === action);
      },
    };
  }

  private clearUserCache(userId: string): void {
    this.permissionsCache.delete(`user_permissions:${userId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.permissionsCache.clear();
    this.rolesCache.clear();
  }
}

export const rbacService = new RBACService();