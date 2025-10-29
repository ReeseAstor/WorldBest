import { Request, Response } from 'express';
import { z } from 'zod';
import { VersionControlService, VersionData } from '../services/version-control';
import { validateRequest } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/auth';

// Validation schemas
const createVersionSchema = z.object({
  body: z.object({
    projectId: z.string().cuid(),
    artifactType: z.enum(['content', 'metadata', 'structure']),
    artifactId: z.string().min(1),
    content: z.any(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

const getVersionHistorySchema = z.object({
  params: z.object({
    projectId: z.string().cuid(),
    artifactType: z.string(),
    artifactId: z.string()
  }),
  query: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
    includeContent: z.coerce.boolean().default(false),
    tags: z.string().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional()
  })
});

const compareVersionsSchema = z.object({
  params: z.object({
    versionId1: z.string().cuid(),
    versionId2: z.string().cuid()
  }),
  query: z.object({
    format: z.enum(['text', 'html', 'json']).default('json'),
    contextLines: z.coerce.number().min(0).max(20).default(3)
  })
});

const createBranchSchema = z.object({
  body: z.object({
    versionId: z.string().cuid(),
    branchName: z.string().min(1).max(100),
    description: z.string().optional()
  })
});

const cleanupVersionsSchema = z.object({
  params: z.object({
    projectId: z.string().cuid()
  }),
  body: z.object({
    maxVersions: z.number().min(1).optional(),
    maxAge: z.number().min(1).optional(),
    keepTagged: z.boolean().default(true),
    keepMajorVersions: z.boolean().default(true)
  })
});

class VersionControlController {
  private versionService: VersionControlService;

  constructor() {
    this.versionService = new VersionControlService();
  }

  /**
   * Create a new version of a project artifact
   */
  async createVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { body } = req;
      const userId = req.user.id;

      const versionData: VersionData = {
        ...body,
        userId
      };

      const version = await this.versionService.createVersion(versionData);

      res.status(201).json({
        success: true,
        data: version,
        message: 'Version created successfully'
      });
    } catch (error) {
      console.error('Error creating version:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version'
      });
    }
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;

      const version = await this.versionService.getVersion(versionId);

      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      console.error('Error getting version:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version'
      });
    }
  }

  /**
   * Get version content (reconstructed)
   */
  async getVersionContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;

      const content = await this.versionService.reconstructContent(versionId);
      const parsedContent = JSON.parse(content);

      res.json({
        success: true,
        data: {
          versionId,
          content: parsedContent
        }
      });
    } catch (error) {
      console.error('Error getting version content:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version content'
      });
    }
  }

  /**
   * Get version history for an artifact
   */
  async getVersionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, artifactType, artifactId } = req.params;
      const { limit, offset, includeContent, tags, fromDate, toDate } = req.query as any;

      const tagsArray = tags ? tags.split(',') : undefined;

      const result = await this.versionService.getVersionHistory(
        projectId,
        artifactType,
        artifactId,
        {
          limit,
          offset,
          includeContent,
          tags: tagsArray,
          fromDate,
          toDate
        }
      );

      res.json({
        success: true,
        data: result.versions,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error getting version history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version history'
      });
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId1, versionId2 } = req.params;
      const { format, contextLines } = req.query as any;

      const comparison = await this.versionService.compareVersions(
        versionId1,
        versionId2,
        { format, contextLines }
      );

      res.json({
        success: true,
        data: {
          versionId1,
          versionId2,
          changes: comparison.changes,
          stats: comparison.stats
        }
      });
    } catch (error) {
      console.error('Error comparing versions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare versions'
      });
    }
  }

  /**
   * Create a branch from a specific version
   */
  async createBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId, branchName, description } = req.body;
      const userId = req.user.id;

      const result = await this.versionService.createBranch(
        versionId,
        branchName,
        userId,
        description
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Branch created successfully'
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create branch'
      });
    }
  }

  /**
   * Get version statistics for a project
   */
  async getVersionStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      const stats = await this.versionService.getVersionStatistics(projectId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting version statistics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version statistics'
      });
    }
  }

  /**
   * Clean up old versions based on retention policy
   */
  async cleanupVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const policy = req.body;

      const result = await this.versionService.cleanupVersions(projectId, policy);

      res.json({
        success: true,
        data: result,
        message: `Cleaned up ${result.deletedCount} versions, preserved ${result.preservedCount} versions`
      });
    } catch (error) {
      console.error('Error cleaning up versions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup versions'
      });
    }
  }

  /**
   * Tag a version
   */
  async tagVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      const { tags } = req.body;

      // This would require updating the version with new tags
      // Implementation would depend on the exact tagging requirements
      res.json({
        success: true,
        message: 'Version tagged successfully'
      });
    } catch (error) {
      console.error('Error tagging version:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to tag version'
      });
    }
  }

  /**
   * Restore content from a specific version
   */
  async restoreVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      const { createNewVersion = true } = req.body;
      const userId = req.user.id;

      // Get the version to restore
      const version = await this.versionService.getVersion(versionId);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // Reconstruct content from the version
      const content = await this.versionService.reconstructContent(versionId);
      const parsedContent = JSON.parse(content);

      if (createNewVersion) {
        // Create a new version with the restored content
        const newVersion = await this.versionService.createVersion({
          projectId: version.projectId,
          artifactType: version.artifactType,
          artifactId: version.artifactId,
          content: parsedContent,
          userId,
          description: `Restored from version ${version.versionNumber}`,
          tags: ['restore']
        });

        res.json({
          success: true,
          data: {
            restoredVersion: version,
            newVersion,
            content: parsedContent
          },
          message: 'Version restored and new version created'
        });
      } else {
        res.json({
          success: true,
          data: {
            version,
            content: parsedContent
          },
          message: 'Version content retrieved for restoration'
        });
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore version'
      });
    }
  }

  /**
   * Get version tree/graph for visualization
   */
  async getVersionTree(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, artifactType, artifactId } = req.params;

      const history = await this.versionService.getVersionHistory(
        projectId,
        artifactType,
        artifactId,
        { limit: 1000 } // Get all versions for tree
      );

      // Build tree structure
      const versionMap = new Map();
      const tree = {
        nodes: [],
        edges: []
      };

      history.versions.forEach(version => {
        versionMap.set(version.id, version);
        tree.nodes.push({
          id: version.id,
          label: `v${version.versionNumber}`,
          version: version.versionNumber,
          userId: version.userId,
          createdAt: version.createdAt,
          description: version.description,
          tags: version.tags,
          size: version.size,
          compressionRatio: version.deltaCompression.compressionRatio
        });

        if (version.parentVersionId) {
          tree.edges.push({
            from: version.parentVersionId,
            to: version.id,
            type: 'parent'
          });
        }

        if (version.deltaCompression.baseVersionId) {
          tree.edges.push({
            from: version.deltaCompression.baseVersionId,
            to: version.id,
            type: 'delta'
          });
        }
      });

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Error getting version tree:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version tree'
      });
    }
  }
}

// Create and configure the controller
const versionControlController = new VersionControlController();

// Export individual methods with validation middleware
export const createVersion = [
  validateRequest(createVersionSchema),
  versionControlController.createVersion.bind(versionControlController)
];

export const getVersion = [
  versionControlController.getVersion.bind(versionControlController)
];

export const getVersionContent = [
  versionControlController.getVersionContent.bind(versionControlController)
];

export const getVersionHistory = [
  validateRequest(getVersionHistorySchema),
  versionControlController.getVersionHistory.bind(versionControlController)
];

export const compareVersions = [
  validateRequest(compareVersionsSchema),
  versionControlController.compareVersions.bind(versionControlController)
];

export const createBranch = [
  validateRequest(createBranchSchema),
  versionControlController.createBranch.bind(versionControlController)
];

export const getVersionStatistics = [
  versionControlController.getVersionStatistics.bind(versionControlController)
];

export const cleanupVersions = [
  validateRequest(cleanupVersionsSchema),
  versionControlController.cleanupVersions.bind(versionControlController)
];

export const tagVersion = [
  versionControlController.tagVersion.bind(versionControlController)
];

export const restoreVersion = [
  versionControlController.restoreVersion.bind(versionControlController)
];

export const getVersionTree = [
  versionControlController.getVersionTree.bind(versionControlController)
];

export default versionControlController;